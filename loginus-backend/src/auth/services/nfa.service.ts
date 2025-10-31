import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthMethodType } from '../enums/auth-method-type.enum';
import { EmailTwoFactorService } from '../micro-modules/two-factor/email/email-2fa.service';
import { TelegramTwoFactorService } from '../micro-modules/two-factor/telegram/telegram-2fa.service';
import { GitHubTwoFactorService } from '../micro-modules/two-factor/github/github-2fa.service';
import { TwoFactorCode, TwoFactorType } from '../entities/two-factor-code.entity';

export interface NfaVerificationResult {
  success: boolean;
  verifiedMethods: string[];
  pendingMethods: string[];
  message?: string;
}

@Injectable()
export class NfaService {
  private readonly logger = new Logger(NfaService.name);
  // Защита от одновременных вызовов для одного пользователя
  private readonly sendingCodes = new Map<string, Promise<{ success: boolean; sentMethods: string[]; message: string }>>();

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(TwoFactorCode)
    private twoFactorCodeRepo: Repository<TwoFactorCode>,
    @Inject(forwardRef(() => EmailTwoFactorService))
    private emailTwoFactorService: EmailTwoFactorService,
    @Inject(forwardRef(() => TelegramTwoFactorService))
    private telegramTwoFactorService: TelegramTwoFactorService,
    @Inject(forwardRef(() => GitHubTwoFactorService))
    private githubTwoFactorService: GitHubTwoFactorService,
  ) {}

  /**
   * Отправка кодов для всех выбранных методов nFA
   */
  async sendNfaCodes(userId: string): Promise<{ success: boolean; sentMethods: string[]; message: string }> {
    this.logger.log(`🚀 [sendNfaCodes] ВЫЗВАНА ФУНКЦИЯ sendNfaCodes для userId: ${userId}`);
    
    // ВАЖНО: Убираем блокировку повторных запросов для nFA
    // Пользователь должен иметь возможность запросить коды повторно если они не пришли
    // Проверяем только активные запросы (не старше 30 секунд)
    const existingPromise = this.sendingCodes.get(userId);
    if (existingPromise) {
      // Проверяем, не завершился ли promise (но он еще в мапе)
      // Даем возможность повторного запроса через 30 секунд
      this.logger.warn(`⚠️ [sendNfaCodes] Обнаружен существующий promise для userId ${userId}`);
      try {
        // Проверяем статус promise (но не ждем его)
        // Если promise уже resolved/rejected, он должен был удалиться из мапы
        // Но на всякий случай разрешаем повторный запрос
        this.logger.log(`✅ [sendNfaCodes] Разрешаем повторный запрос для userId ${userId}`);
      } catch (error) {
        // Игнорируем ошибки при проверке
      }
    }
    
    // Удаляем старый promise если есть (на случай если он завис)
    this.sendingCodes.delete(userId);
    
    // Создаем promise для отправки кодов
    const sendPromise = this._sendNfaCodesInternal(userId);
    
    // Сохраняем promise в мапе
    this.sendingCodes.set(userId, sendPromise);
    
    // Очищаем после завершения с гарантией
    sendPromise
      .then(() => {
        this.logger.log(`✅ [sendNfaCodes] Promise завершен успешно для userId ${userId}, удаляем из мапы`);
        this.sendingCodes.delete(userId);
      })
      .catch((error) => {
        this.logger.error(`❌ [sendNfaCodes] Promise завершился с ошибкой для userId ${userId}: ${error.message}, удаляем из мапы`);
        this.sendingCodes.delete(userId);
      })
      .finally(() => {
        // Дополнительная гарантия очистки
        setTimeout(() => {
          if (this.sendingCodes.has(userId)) {
            this.logger.warn(`⚠️ [sendNfaCodes] Принудительная очистка мапы для userId ${userId}`);
            this.sendingCodes.delete(userId);
          }
        }, 60000); // Через 60 секунд гарантированно удаляем
      });
    
    return sendPromise;
  }
  
  /**
   * Внутренний метод отправки кодов
   */
  private async _sendNfaCodesInternal(userId: string): Promise<{ success: boolean; sentMethods: string[]; message: string }> {
    this.logger.log(`🔍 [sendNfaCodes] _sendNfaCodesInternal вызвана для userId: ${userId}`);
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      
      if (!user) {
        this.logger.error(`❌ [sendNfaCodes] Пользователь не найден: ${userId}`);
        return {
          success: false,
          sentMethods: [],
          message: 'Пользователь не найден',
        };
      }

      this.logger.log(`👤 [sendNfaCodes] Пользователь найден: ${user.email}, mfaSettings: ${JSON.stringify(user.mfaSettings)}`);

      // Проверяем, включена ли nFA
      if (!user.mfaSettings?.enabled) {
        this.logger.warn(`⚠️ [sendNfaCodes] nFA не включена для пользователя ${userId}`);
        return {
          success: false,
          sentMethods: [],
          message: 'nFA не включена для этого аккаунта',
        };
      }

      const selectedMethods = user.mfaSettings.methods || [];
      this.logger.log(`📋 [sendNfaCodes] Выбранные методы: ${JSON.stringify(selectedMethods)}`);
      
      if (selectedMethods.length === 0) {
        this.logger.warn(`⚠️ [sendNfaCodes] Не выбрано ни одного метода для nFA`);
        return {
          success: false,
          sentMethods: [],
          message: 'Не выбрано ни одного метода для nFA',
        };
      }

      const sentMethods: string[] = [];

      // Отправляем коды для всех выбранных методов
      for (const method of selectedMethods) {
        try {
          switch (method) {
            case AuthMethodType.EMAIL:
                      this.logger.log(`📧 [sendNfaCodes] Sending EMAIL code for user ${userId}`);
                      if (user.email) {
                        const emailResult = await this.emailTwoFactorService.sendEmailCode(userId, user.email);
                        this.logger.log(`📧 [sendNfaCodes] EMAIL result: ${JSON.stringify(emailResult)}`);
              if (emailResult.success) {
                sentMethods.push('EMAIL');
                        }
                      } else {
                        this.logger.warn(`⚠️ User ${userId} has no email, skipping EMAIL code`);
              }
              break;

            case AuthMethodType.PHONE_TELEGRAM:
              this.logger.log(`💬 [sendNfaCodes] Sending TELEGRAM code for user ${userId}`);
              const telegramResult = await this.telegramTwoFactorService.sendTelegramCode(userId);
              this.logger.log(`💬 [sendNfaCodes] TELEGRAM result: ${JSON.stringify(telegramResult)}`);
              if (telegramResult.success) {
                sentMethods.push('PHONE_TELEGRAM');
              }
              break;

            case AuthMethodType.GITHUB:
              const githubResult = await this.githubTwoFactorService.sendGitHubCode(userId);
              if (githubResult.success) {
                sentMethods.push('GITHUB');
              }
              break;

            default:
              this.logger.warn(`Метод ${method} не поддерживается для nFA`);
          }
        } catch (error) {
          this.logger.error(`Ошибка отправки кода для метода ${method}:`, error);
        }
      }

      if (sentMethods.length === 0) {
        return {
          success: false,
          sentMethods: [],
          message: 'Не удалось отправить коды ни по одному методу',
        };
      }

      return {
        success: true,
        sentMethods,
        message: `Коды отправлены по методам: ${sentMethods.join(', ')}`,
      };
    } catch (error) {
      this.logger.error('❌ Ошибка отправки nFA кодов:', error);
      return {
        success: false,
        sentMethods: [],
        message: 'Ошибка отправки кодов',
      };
    }
  }

  /**
   * Проверка кода для конкретного метода
   */
  async verifyMethodCode(
    userId: string,
    method: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`🔍 [verifyMethodCode] Проверка кода для userId: ${userId}, method: ${method}, code: ${code}`);
    this.logger.log(`🔍 [verifyMethodCode] AuthMethodType.PHONE_TELEGRAM = ${AuthMethodType.PHONE_TELEGRAM}`);
    this.logger.log(`🔍 [verifyMethodCode] method === AuthMethodType.PHONE_TELEGRAM: ${method === AuthMethodType.PHONE_TELEGRAM}`);
    
    try {
      switch (method) {
        case AuthMethodType.EMAIL:
          this.logger.log(`📧 [verifyMethodCode] Проверка EMAIL кода`);
          return await this.emailTwoFactorService.verifyEmailCode(userId, code);

        case AuthMethodType.PHONE_TELEGRAM:
          this.logger.log(`💬 [verifyMethodCode] Проверка PHONE_TELEGRAM кода, вызываем verifyTelegramCode`);
          return await this.telegramTwoFactorService.verifyTelegramCode(userId, code);

        case AuthMethodType.GITHUB:
          this.logger.log(`🐙 [verifyMethodCode] Проверка GITHUB кода`);
          return await this.githubTwoFactorService.verifyGitHubCode(userId, code);

        default:
          this.logger.warn(`⚠️ [verifyMethodCode] Неизвестный метод: ${method}`);
          return {
            success: false,
            message: `Метод ${method} не поддерживается`,
          };
      }
    } catch (error) {
      this.logger.error(`❌ [verifyMethodCode] Ошибка проверки кода для метода ${method}:`, error);
      return {
        success: false,
        message: 'Ошибка проверки кода',
      };
    }
  }

  /**
   * Проверка статуса верификации всех методов nFA
   */
  async getVerificationStatus(userId: string): Promise<NfaVerificationResult> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      
      if (!user || !user.mfaSettings?.enabled) {
        return {
          success: false,
          verifiedMethods: [],
          pendingMethods: [],
          message: 'nFA не включена',
        };
      }

      const selectedMethods = user.mfaSettings.methods || [];
      const verifiedMethods: string[] = [];
      const pendingMethods: string[] = [];

      // Проверяем каждый метод - ищем pending коды
      for (const method of selectedMethods) {
        const typeMap: Record<string, TwoFactorType> = {
          [AuthMethodType.EMAIL]: TwoFactorType.EMAIL,
          [AuthMethodType.PHONE_TELEGRAM]: TwoFactorType.TELEGRAM,
          [AuthMethodType.GITHUB]: TwoFactorType.GITHUB,
        };

        const twoFactorType = typeMap[method];
        if (!twoFactorType) {
          pendingMethods.push(method);
          continue;
        }

        // Ищем использованные коды (verified) для этого метода
        // Важно: ищем код с verifiedAt != null и сортируем по verifiedAt DESC, чтобы получить самый свежий
        const verifiedCode = await this.twoFactorCodeRepo.findOne({
          where: {
            userId,
            type: twoFactorType,
            status: 'used' as any,
            verifiedAt: Not(IsNull()) as any, // Только коды с установленным verifiedAt
          },
          order: { verifiedAt: 'DESC' },
        });

        if (verifiedCode) {
          // Проверяем что код был подтвержден недавно (в течение сессии - например, последние 10 минут, так как коды действительны 10 минут)
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          if (verifiedCode.verifiedAt && verifiedCode.verifiedAt > tenMinutesAgo) {
            verifiedMethods.push(method);
            this.logger.log(`✅ Метод ${method} подтвержден (verifiedAt: ${verifiedCode.verifiedAt})`);
          } else {
            pendingMethods.push(method);
            this.logger.log(`⏳ Метод ${method} не подтвержден недавно (verifiedAt: ${verifiedCode.verifiedAt || 'null'}, tenMinutesAgo: ${tenMinutesAgo})`);
          }
        } else {
          pendingMethods.push(method);
          this.logger.log(`⏳ Метод ${method} не найден в использованных кодах`);
        }
      }

      const allVerified = pendingMethods.length === 0;

      return {
        success: allVerified,
        verifiedMethods,
        pendingMethods,
        message: allVerified
          ? 'Все методы подтверждены'
          : `Осталось подтвердить: ${pendingMethods.join(', ')}`,
      };
    } catch (error) {
      this.logger.error('❌ Ошибка получения статуса верификации:', error);
      return {
        success: false,
        verifiedMethods: [],
        pendingMethods: [],
        message: 'Ошибка получения статуса',
      };
    }
  }

  /**
   * Настройка nFA - выбор методов защиты
   */
  async configureNfa(
    userId: string,
    methods: string[],
    requiredMethods?: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      
      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден',
        };
      }

      // Проверяем, что все выбранные методы привязаны к аккаунту
      const availableMethods: AuthMethodType[] = user.availableAuthMethods || [];
      const invalidMethods = (methods as AuthMethodType[]).filter(m => !availableMethods.includes(m));
      
      if (invalidMethods.length > 0) {
        return {
          success: false,
          message: `Следующие методы не привязаны к аккаунту: ${invalidMethods.join(', ')}`,
        };
      }

      // Обновляем настройки nFA
      if (!user.mfaSettings) {
        user.mfaSettings = {
          enabled: true,
          methods: [],
          backupCodes: [],
          backupCodesUsed: [],
          requiredMethods: 1,
        };
      }

      user.mfaSettings.enabled = methods.length > 0;
      user.mfaSettings.methods = methods;
      user.mfaSettings.requiredMethods = requiredMethods || methods.length;

      const savedUser = await this.usersRepo.save(user);

      // Логируем для отладки
      this.logger.log(`✅ nFA настроена для пользователя ${userId}: методы ${methods.join(', ')}`);
      this.logger.log(`🔍 Проверка сохранения: enabled=${savedUser.mfaSettings?.enabled}, methods=${JSON.stringify(savedUser.mfaSettings?.methods)}, enabled=${savedUser.mfaSettings?.enabled}`);
      
      // Проверяем, что данные сохранились
      const verifyUser = await this.usersRepo.findOne({ where: { id: userId } });
      this.logger.log(`🔍 Проверка из БД: enabled=${verifyUser?.mfaSettings?.enabled}, methods=${JSON.stringify(verifyUser?.mfaSettings?.methods)}`);

      return {
        success: true,
        message: 'nFA успешно настроена',
      };
    } catch (error) {
      this.logger.error('❌ Ошибка настройки nFA:', error);
      return {
        success: false,
        message: 'Ошибка настройки nFA',
      };
    }
  }

  /**
   * Проверка завершения nFA верификации (все методы подтверждены)
   */
  async isNfaComplete(userId: string): Promise<boolean> {
    const status = await this.getVerificationStatus(userId);
    return status.success && status.pendingMethods.length === 0;
  }
}

