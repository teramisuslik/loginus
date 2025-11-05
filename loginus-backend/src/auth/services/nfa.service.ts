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
    
    // ВАЖНО: ПОЛНОСТЬЮ УБРАНА блокировка повторных запросов для nFA
    // Пользователь должен иметь возможность запросить коды повторно если они не пришли
    // Не используем Map для блокировки - каждый запрос обрабатывается независимо
    // Это гарантирует, что коды всегда отправляются, даже при параллельных запросах
    
    // Просто вызываем отправку кодов без блокировки
    return this._sendNfaCodesInternal(userId);
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
      // ✅ ИСПРАВЛЕНИЕ: Добавляем небольшую задержку между отправкой кодов для разных методов
      // Это помогает избежать проблем с rate limiting и улучшает надежность доставки
      for (let i = 0; i < selectedMethods.length; i++) {
        const method = selectedMethods[i];
        try {
          // Добавляем задержку между отправкой кодов (кроме первого метода)
          if (i > 0) {
            const delay = 500; // 500ms задержка между методами
            this.logger.log(`⏳ [sendNfaCodes] Задержка ${delay}ms перед отправкой кода для метода ${method}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
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
      let result;
      switch (method) {
        case AuthMethodType.EMAIL:
          this.logger.log(`📧 [verifyMethodCode] Проверка EMAIL кода`);
          result = await this.emailTwoFactorService.verifyEmailCode(userId, code);
          break;

        case AuthMethodType.PHONE_TELEGRAM:
          this.logger.log(`💬 [verifyMethodCode] Проверка PHONE_TELEGRAM кода, вызываем verifyTelegramCode`);
          result = await this.telegramTwoFactorService.verifyTelegramCode(userId, code);
          break;

        case AuthMethodType.GITHUB:
          this.logger.log(`🐙 [verifyMethodCode] Проверка GITHUB кода`);
          result = await this.githubTwoFactorService.verifyGitHubCode(userId, code);
          break;

        default:
          this.logger.warn(`⚠️ [verifyMethodCode] Неизвестный метод: ${method}`);
          return {
            success: false,
            message: `Метод ${method} не поддерживается`,
          };
      }
      
        // ✅ ИСПРАВЛЕНИЕ: После успешной верификации кода, логируем для отладки
      if (result.success) {
        this.logger.log(`✅ [verifyMethodCode] Код успешно проверен для метода ${method}`);
      }
      
      return result;
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
          this.logger.warn(`⚠️ Unknown method type for nFA: ${method}`);
          pendingMethods.push(method);
          continue;
        }

        this.logger.log(`🔍 Checking verification status for method: ${method}, type: ${twoFactorType}`);

        // Ищем использованные коды (verified) для этого метода
        // ✅ ИСПРАВЛЕНИЕ: Ищем код с verifiedAt не старше 15 минут, чтобы избежать старых кодов
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        this.logger.log(`🔍 [getVerificationStatus] Ищем код для метода ${method}, type ${twoFactorType}, userId ${userId}, минимум verifiedAt: ${fifteenMinutesAgo.toISOString()}`);
        
        const verifiedCode = await this.twoFactorCodeRepo
          .createQueryBuilder('code')
          .where('code.userId = :userId', { userId })
          .andWhere('code.type = :type', { type: twoFactorType })
          .andWhere('code.verifiedAt IS NOT NULL')
          .andWhere('code.verifiedAt > :fifteenMinutesAgo', { fifteenMinutesAgo: fifteenMinutesAgo.toISOString() })
          .orderBy('code.verifiedAt', 'DESC')
          .getOne();
        
        this.logger.log(`🔍 [getVerificationStatus] Запрос выполнен, найдено кодов: ${verifiedCode ? 1 : 0}`);
        
        this.logger.log(`🔍 Found verified code for ${method}: ${verifiedCode ? 'yes' : 'no'}`, verifiedCode ? { verifiedAt: verifiedCode.verifiedAt, status: verifiedCode.status, type: verifiedCode.type } : null);

        if (verifiedCode) {
          // Проверяем что код был подтвержден недавно (в течение сессии - например, последние 10 минут, так как коды действительны 10 минут)
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          
          // ✅ ИСПРАВЛЕНИЕ: Правильное преобразование verifiedAt в Date
          let verifiedAtDate: Date | null = null;
          if (verifiedCode.verifiedAt instanceof Date) {
            verifiedAtDate = verifiedCode.verifiedAt;
          } else if (verifiedCode.verifiedAt) {
            verifiedAtDate = new Date(verifiedCode.verifiedAt);
          }
          
          this.logger.log(`🔍 [getVerificationStatus] Method ${method}: verifiedAtDate=${verifiedAtDate ? verifiedAtDate.toISOString() : 'null'}, tenMinutesAgo=${tenMinutesAgo.toISOString()}`);
          
          if (verifiedAtDate && verifiedAtDate > tenMinutesAgo) {
            verifiedMethods.push(method);
            this.logger.log(`✅ Метод ${method} подтвержден (verifiedAt: ${verifiedAtDate.toISOString()}, tenMinutesAgo: ${tenMinutesAgo.toISOString()}, diff: ${(verifiedAtDate.getTime() - tenMinutesAgo.getTime()) / 1000}s)`);
          } else {
            pendingMethods.push(method);
            this.logger.warn(`⏳ Метод ${method} не подтвержден недавно (verifiedAt: ${verifiedAtDate ? verifiedAtDate.toISOString() : 'null'}, tenMinutesAgo: ${tenMinutesAgo.toISOString()}, diff: ${verifiedAtDate ? (verifiedAtDate.getTime() - tenMinutesAgo.getTime()) / 1000 : 'N/A'}s)`);
          }
        } else {
          pendingMethods.push(method);
          this.logger.warn(`⏳ Метод ${method} не найден в использованных кодах. Searching for any codes with type ${twoFactorType}...`);
          
          // Дополнительная проверка: ищем все коды для этого метода (для отладки)
          const allCodes = await this.twoFactorCodeRepo.find({
            where: {
              userId,
              type: twoFactorType,
            },
            order: { verifiedAt: 'DESC' },
            take: 5,
          });
          
          this.logger.log(`🔍 Found ${allCodes.length} codes for method ${method}:`, allCodes.map(c => ({
            id: c.id,
            status: c.status,
            verifiedAt: c.verifiedAt ? (c.verifiedAt instanceof Date ? c.verifiedAt.toISOString() : new Date(c.verifiedAt).toISOString()) : 'null',
            createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString(),
          })));
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

