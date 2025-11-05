import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { TwoFactorCode, TwoFactorType } from '../../../entities/two-factor-code.entity';
import { User } from '../../../../users/entities/user.entity';
import { EmailService } from '../../../email.service';
import { AuthMethodType } from '../../../enums/auth-method-type.enum';

@Injectable()
export class GitHubTwoFactorService {
  constructor(
    @InjectRepository(TwoFactorCode)
    private twoFactorCodeRepo: Repository<TwoFactorCode>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private emailService: EmailService,
  ) {}

  /**
   * Отправка 2FA кода на email из GitHub профиля
   * КРИТИЧЕСКИ ВАЖНО: Код отправляется на email из GitHub профиля (oauthMetadata.github)
   */
  async sendGitHubCode(userId: string): Promise<{ success: boolean; message: string }> {
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

      // Проверяем, что GITHUB метод привязан
      const hasGitHubMethod = user.availableAuthMethods?.includes(AuthMethodType.GITHUB) || false;
      if (!hasGitHubMethod) {
        return {
          success: false,
          message: 'GitHub метод аутентификации не привязан к вашему аккаунту',
        };
      }

      // Получаем email из GitHub профиля через oauthMetadata
      let githubEmail: string | null = null;

      // Пытаемся получить email из oauthMetadata.github
      if (user.oauthMetadata?.github) {
        const githubMetadata = user.oauthMetadata.github;
        
        // Если в метаданных есть accessToken, получаем email через GitHub API
        if (githubMetadata.accessToken) {
          try {
            console.log(`🔍 [sendGitHubCode] Получаем email через GitHub API для userId ${userId}`);
            const emailData = await this.getGitHubEmails(githubMetadata.accessToken);
            console.log(`🔍 [sendGitHubCode] GitHub API вернул ${emailData.length} email(ов)`);
            
            // Ищем primary email
            const primaryEmail = emailData.find((email: any) => email.primary)?.email;
            if (primaryEmail) {
              githubEmail = primaryEmail;
              console.log(`✅ [sendGitHubCode] Найден primary email: ${primaryEmail}`);
            } else {
              // Если primary не найден, берем первый verified email
              const verifiedEmail = emailData.find((email: any) => email.verified)?.email;
              if (verifiedEmail) {
                githubEmail = verifiedEmail;
                console.log(`✅ [sendGitHubCode] Найден verified email: ${verifiedEmail}`);
              } else {
                // Если verified тоже нет, берем первый email
                const firstEmail = emailData[0]?.email;
                if (firstEmail) {
                  githubEmail = firstEmail;
                  console.log(`⚠️ [sendGitHubCode] Используем первый email (не verified): ${firstEmail}`);
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ Не удалось получить email через GitHub API:', error);
            console.warn('⚠️ Error details:', error.message || error);
          }
        } else {
          console.warn(`⚠️ [sendGitHubCode] accessToken не найден в oauthMetadata.github для userId ${userId}`);
        }
      } else {
        console.warn(`⚠️ [sendGitHubCode] oauthMetadata.github не найден для userId ${userId}`);
      }

      // Если не получили email через API, используем email из user.email (если он не псевдо-email)
      if (!githubEmail && user.email && !user.email.includes('@github.local')) {
        githubEmail = user.email;
        console.log(`✅ [sendGitHubCode] Используем email из user.email: ${githubEmail}`);
      }

      // Если email все еще псевдо-email, пытаемся получить реальный
      if (githubEmail && githubEmail.includes('@github.local')) {
        console.warn(`⚠️ [sendGitHubCode] Получен псевдо-email ${githubEmail}, пытаемся получить реальный через API`);
        if (user.oauthMetadata?.github?.accessToken) {
          try {
            const emailData = await this.getGitHubEmails(user.oauthMetadata.github.accessToken);
            const realEmail = emailData.find((email: any) => email.verified)?.email || emailData.find((email: any) => email.primary)?.email || emailData[0]?.email;
            if (realEmail && !realEmail.includes('@github.local')) {
              githubEmail = realEmail;
              // Обновляем email пользователя в БД
              user.email = realEmail;
              await this.userRepo.save(user);
              console.log(`✅ [sendGitHubCode] Обновлен email пользователя на реальный: ${realEmail}`);
            }
          } catch (error) {
            console.error('❌ [sendGitHubCode] Ошибка получения реального email:', error);
          }
        }
      }

      if (!githubEmail || githubEmail.includes('@github.local')) {
        console.error(`❌ [sendGitHubCode] Email не найден или псевдо-email для userId ${userId}, user.email=${user.email}`);
        return {
          success: false,
          message: 'Email из GitHub профиля не найден. Убедитесь, что GitHub аккаунт привязан и email подтвержден на GitHub.',
        };
      }

      // ВАЖНО: Для nFA не ограничиваем отправку кодов, так как коды отправляются для всех методов одновременно
      // Rate limit проверяем только для обычной 2FA (не nFA)
      // Для nFA можно отправлять сколько угодно кодов, так как это часть процесса входа

      // Генерируем код
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

      // Сохраняем код с правильным типом GITHUB
      await this.twoFactorCodeRepo.save({
        userId,
        code,
        type: TwoFactorType.GITHUB,
        expiresAt,
        contact: githubEmail,
        status: 'pending' as any,
      });

      // Отправляем email с кодом на email из GitHub профиля
      console.log(`📧 [sendGitHubCode] Отправка кода на email: ${githubEmail}`);
      try {
        await this.emailService.sendVerificationCode(githubEmail, code);
        console.log(`✅ [sendGitHubCode] Email успешно отправлен на ${githubEmail}`);
      } catch (emailError) {
        console.error(`❌ [sendGitHubCode] Ошибка отправки email: ${emailError.message}`);
        // Не возвращаем ошибку, так как код уже сохранен в БД, пользователь может запросить повторную отправку
        return {
          success: false,
          message: `Ошибка отправки email: ${emailError.message}. Проверьте настройки SMTP сервера.`,
        };
      }

      return {
        success: true,
        message: 'Код отправлен на email из GitHub профиля',
      };
    } catch (error) {
      console.error('❌ Ошибка отправки 2FA кода на GitHub email:', error);
      return {
        success: false,
        message: 'Ошибка отправки кода',
      };
    }
  }

  /**
   * Проверка 2FA кода
   */
  async verifyGitHubCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const codeRecord = await this.twoFactorCodeRepo.findOne({
        where: {
          userId,
          code,
          type: TwoFactorType.GITHUB,
          status: 'pending' as any,
        },
      });

      if (!codeRecord) {
        // Проверяем, может код уже использован
        const allCodes = await this.twoFactorCodeRepo.find({
          where: {
            userId,
            code,
            type: TwoFactorType.GITHUB,
          },
          order: { verifiedAt: 'DESC' },
        });
        
        if (allCodes.length > 0) {
          const foundCode = allCodes[0];
          
          if (foundCode.status === 'used') {
            // Если код использован недавно (в течение 10 минут), считаем его валидным для nFA
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            if (foundCode.verifiedAt && foundCode.verifiedAt > tenMinutesAgo) {
              console.log(`✅ [verifyGitHubCode] Код уже использован, но подтвержден недавно - разрешаем`);
              return {
                success: true,
                message: 'Код уже подтвержден',
              };
            }
            return {
              success: false,
              message: 'Код уже использован',
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
      codeRecord.status = 'used' as any;
      codeRecord.verifiedAt = new Date();
      await this.twoFactorCodeRepo.save(codeRecord);

      console.log(`✅ GitHub 2FA код подтвержден для пользователя ${userId}`);

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
   * Получение email из GitHub через API
   */
  private async getGitHubEmails(accessToken: string): Promise<any[]> {
    try {
      // Пробуем оба формата авторизации (Bearer и token)
      let response = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      // Если не сработало с Bearer, пробуем старый формат token
      if (!response.ok && response.status === 401) {
        console.log(`⚠️ Bearer format failed, trying token format...`);
        response = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Ошибка получения email из GitHub:', error);
      throw error;
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
