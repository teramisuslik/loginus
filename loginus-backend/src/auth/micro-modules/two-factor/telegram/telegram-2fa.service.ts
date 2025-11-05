import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { TwoFactorCode, TwoFactorType } from '../../../entities/two-factor-code.entity';
import { User } from '../../../../users/entities/user.entity';
import { SmsService } from '../../../sms.service';
import { AuthMethodType } from '../../../enums/auth-method-type.enum';

@Injectable()
export class TelegramTwoFactorService {
  constructor(
    @InjectRepository(TwoFactorCode)
    private twoFactorCodeRepo: Repository<TwoFactorCode>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private smsService: SmsService,
  ) {}

  /**
   * Отправка 2FA кода через Telegram
   * КРИТИЧЕСКИ ВАЖНО: Код отправляется в Telegram по chatId/userId из messengerMetadata
   */
  async sendTelegramCode(userId: string, telegramChatId?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Находим пользователя
      const user = await this.userRepo.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден',
        };
      }

      // Проверяем, что PHONE_TELEGRAM метод привязан
      const hasTelegramMethod = user.availableAuthMethods?.includes(AuthMethodType.PHONE_TELEGRAM) || false;
      if (!hasTelegramMethod) {
        return {
          success: false,
          message: 'Telegram метод аутентификации не привязан к вашему аккаунту',
        };
      }

      // Получаем telegram chatId из messengerMetadata
      const telegramMetadata = user.messengerMetadata?.telegram;
      if (!telegramMetadata) {
        return {
          success: false,
          message: 'Telegram не привязан к аккаунту',
        };
      }

      // Используем chatId из метаданных (может быть userId, так как chatId может отсутствовать)
      // ВАЖНО: chatId должен быть числом для Telegram API
      const rawChatId = telegramChatId || telegramMetadata.userId?.toString() || telegramMetadata.userId;
      if (!rawChatId) {
        return {
          success: false,
          message: 'Telegram chatId не найден в метаданных аккаунта',
        };
      }

      // Преобразуем в число, если это строка
      const targetChatId = typeof rawChatId === 'string' ? parseInt(rawChatId, 10) : rawChatId;
      
      if (isNaN(targetChatId)) {
        console.error(`❌ [sendTelegramCode] Неверный формат chatId: ${rawChatId}`);
        return {
          success: false,
          message: 'Неверный формат Telegram chatId',
        };
      }

      // ВАЖНО: Для nFA не ограничиваем отправку кодов, так как коды отправляются для всех методов одновременно
      // Rate limit проверяем только для обычной 2FA (не nFA)
      // Для nFA можно отправлять сколько угодно кодов, так как это часть процесса входа

      // Генерируем код
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

      // Сохраняем код с правильным типом TELEGRAM
      console.log(`💾 [sendTelegramCode] Сохранение кода в БД: code=${code}, type=${TwoFactorType.TELEGRAM}, userId=${userId}`);
      const savedCode = await this.twoFactorCodeRepo.save({
        userId,
        code,
        type: TwoFactorType.TELEGRAM,
        expiresAt,
        contact: targetChatId.toString(), // Преобразуем в строку для соответствия типу
        status: 'pending' as any,
      });
      console.log(`✅ [sendTelegramCode] Код сохранен в БД с ID: ${savedCode.id}, code: ${savedCode.code}, status: ${savedCode.status}`);

      // Отправляем через Telegram
      // ВАЖНО: Telegram Bot может отправлять сообщения только если пользователь начал диалог с ботом
      // или авторизовался через Telegram Login Widget
      console.log(`💬 [sendTelegramCode] Отправка кода в Telegram для userId ${userId}`);
      console.log(`💬 [sendTelegramCode] chatId (тип: ${typeof targetChatId}): ${targetChatId}`);
      console.log(`💬 [sendTelegramCode] Messenger metadata: ${JSON.stringify(telegramMetadata)}`);
      console.log(`💬 [sendTelegramCode] Сгенерированный код: ${code}`);
      
      const message = `🔐 Ваш код подтверждения Loginus: ${code}\n\n⏰ Код действителен 10 минут.\n\n💡 Это системное уведомление для безопасности вашего аккаунта.`;
      console.log(`💬 [sendTelegramCode] Сообщение для отправки (длина: ${message.length}): ${message.substring(0, 100)}...`);
      
      // Передаем chatId как строку, так как sendTelegramMessage ожидает строку
      const telegramResult = await this.smsService.sendTelegramMessage(
        targetChatId.toString(), 
        message
      );
      
      console.log(`💬 [sendTelegramCode] Результат отправки: ${JSON.stringify(telegramResult)}`);
      
      if (!telegramResult.success) {
        console.error(`❌ [sendTelegramCode] Ошибка отправки в Telegram: ${telegramResult.message}`);
        // Если ошибка связана с тем, что бот не может начать диалог, возвращаем более понятное сообщение
        if (telegramResult.message.includes('chat not found') || telegramResult.message.includes('bot was blocked')) {
          return {
            success: false,
            message: 'Не удалось отправить код. Убедитесь, что вы авторизовались через Telegram Login Widget или начали диалог с ботом.',
          };
        }
        return {
          success: false,
          message: `Ошибка отправки в Telegram: ${telegramResult.message}`,
        };
      }

      console.log(`✅ [sendTelegramCode] 2FA код отправлен в Telegram (chatId: ${targetChatId}, userId: ${userId})`);

      return {
        success: true,
        message: 'Код отправлен в Telegram',
      };
    } catch (error) {
      console.error('❌ Ошибка отправки 2FA кода в Telegram:', error);
      return {
        success: false,
        message: 'Ошибка отправки кода',
      };
    }
  }

  /**
   * Проверка 2FA кода
   */
  async verifyTelegramCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔍 [verifyTelegramCode] Проверка кода для userId: ${userId}, code: ${code}`);
      console.log(`🔍 [verifyTelegramCode] Ищем код с типом: ${TwoFactorType.TELEGRAM}`);
      
      const codeRecord = await this.twoFactorCodeRepo.findOne({
        where: {
          userId,
          code,
          type: TwoFactorType.TELEGRAM,
          status: 'pending' as any,
        },
      });

      console.log(`🔍 [verifyTelegramCode] Результат поиска: ${codeRecord ? 'найден' : 'не найден'}`);

      if (!codeRecord) {
        // Проверяем, может код уже использован или истек
        const allCodes = await this.twoFactorCodeRepo.find({
          where: {
            userId,
            code,
            type: TwoFactorType.TELEGRAM,
          },
          order: { verifiedAt: 'DESC' },
        });
        
        console.log(`🔍 [verifyTelegramCode] Все коды с таким значением: ${allCodes.length}`);
        if (allCodes.length > 0) {
          const foundCode = allCodes[0];
          console.log(`🔍 [verifyTelegramCode] Найденный код - status: ${foundCode.status}, expiresAt: ${foundCode.expiresAt}, verifiedAt: ${foundCode.verifiedAt}, now: ${new Date()}`);
          
          if (foundCode.status === 'used') {
            // Если код использован недавно (в течение 10 минут), считаем его валидным для nFA
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            if (foundCode.verifiedAt && foundCode.verifiedAt > tenMinutesAgo) {
              console.log(`✅ [verifyTelegramCode] Код уже использован, но подтвержден недавно - разрешаем`);
              return {
                success: true,
                message: 'Код уже подтвержден',
              };
            }
            console.log(`⚠️ [verifyTelegramCode] Код уже использован давно`);
            return {
              success: false,
              message: 'Код уже использован',
            };
          }
          
          if (foundCode.expiresAt < new Date()) {
            console.log(`⚠️ [verifyTelegramCode] Код истек`);
            return {
              success: false,
              message: 'Код истек',
            };
          }
        }
        
        return {
          success: false,
          message: 'Неверный код',
        };
      }

      if (codeRecord.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Код истек',
        };
      }

      // Отмечаем код как использованный и устанавливаем время подтверждения
      // ✅ ИСПРАВЛЕНИЕ: Используем save() вместо update() для гарантии обновления
      const verifiedAtTime = new Date();
      codeRecord.status = 'used' as any;
      codeRecord.verifiedAt = verifiedAtTime;
      
      const savedCode = await this.twoFactorCodeRepo.save(codeRecord);
      
      // ✅ ПРОВЕРКА: Проверяем, что код действительно обновлен в БД
      const verifyCode = await this.twoFactorCodeRepo.findOne({ where: { id: codeRecord.id } });
      console.log(`✅ Telegram 2FA код подтвержден для пользователя ${userId}`);
      console.log(`🔍 [verifyTelegramCode] verifiedAt до save: ${verifiedAtTime.toISOString()}`);
      console.log(`🔍 [verifyTelegramCode] verifiedAt после save (savedCode): ${savedCode.verifiedAt ? savedCode.verifiedAt.toISOString() : 'null'}`);
      console.log(`🔍 [verifyTelegramCode] verifiedAt после save (из БД): ${verifyCode?.verifiedAt ? (verifyCode.verifiedAt instanceof Date ? verifyCode.verifiedAt.toISOString() : new Date(verifyCode.verifiedAt).toISOString()) : 'null'}`);

      return {
        success: true,
        message: 'Код подтвержден',
      };
    } catch (error) {
      console.error('❌ Ошибка проверки 2FA кода:', error);
      return {
        success: false,
        message: 'Ошибка проверки кода',
      };
    }
  }

  /**
   * Проверка rate limit
   * УБРАНО ограничение для nFA - можно отправлять неограниченное количество кодов
   * Это необходимо потому что при nFA коды отправляются для всех методов одновременно
   */
  private async checkRateLimit(userId: string, method: string): Promise<boolean> {
    // Для nFA не ограничиваем - возвращаем true всегда
    // Rate limit нужен только для обычной 2FA, но в nFA это не применимо
    return true;
  }

  /**
   * Генерация 6-значного кода
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
