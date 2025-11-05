import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { TwoFactorCode } from '../../../entities/two-factor-code.entity';
import { User } from '../../../../users/entities/user.entity';
import { EmailService } from '../../../email.service';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../../../entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthMethodType } from '../../../enums/auth-method-type.enum';

@Injectable()
export class EmailTwoFactorService {
  constructor(
    @InjectRepository(TwoFactorCode)
    private twoFactorCodeRepo: Repository<TwoFactorCode>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private emailService: EmailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Отправка 2FA кода на email
   * КРИТИЧЕСКИ ВАЖНО: Код отправляется на email, который привязан к EMAIL методу аутентификации
   */
  async sendEmailCode(userId: string, email?: string): Promise<{ success: boolean; message: string }> {
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

      // Проверяем, что EMAIL метод привязан
      const hasEmailMethod = user.availableAuthMethods?.includes(AuthMethodType.EMAIL) || false;
      if (!hasEmailMethod) {
        return {
          success: false,
          message: 'EMAIL метод аутентификации не привязан к вашему аккаунту',
        };
      }

      // Используем email из профиля пользователя (который привязан к EMAIL методу)
      const userEmail = user.email;
      
      // ВАЖНО: Для пользователей, зарегистрированных через OAuth, email может быть псевдо-email (@telegram.local, @github.local)
      // Для nFA нужно найти реальный email - пробуем GitHub API если есть accessToken
      let targetEmail = userEmail;
      let isPseudoEmail = userEmail?.includes('@telegram.local') || userEmail?.includes('@github.local') || !user.emailVerified;
      
      if (isPseudoEmail) {
        console.log(`📧 Обнаружен псевдо-email или неподтвержденный email: ${userEmail}, ищем реальный email`);
        
        // Пытаемся получить реальный email из GitHub если есть accessToken
        const githubMetadata = (user.oauthMetadata as any)?.github;
        if (githubMetadata?.accessToken) {
          try {
            console.log(`📧 Пытаемся получить email через GitHub API для userId ${userId}`);
            const response = await fetch('https://api.github.com/user/emails', {
              headers: {
                'Authorization': `Bearer ${githubMetadata.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            });
            
            if (!response.ok && response.status === 401) {
              // Пробуем старый формат
              const retryResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                  'Authorization': `token ${githubMetadata.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json',
                },
              });
              
              if (retryResponse.ok) {
                const emailData = await retryResponse.json();
                const primaryEmail = emailData.find((e: any) => e.primary)?.email || emailData.find((e: any) => e.verified)?.email || emailData[0]?.email;
                if (primaryEmail && !primaryEmail.includes('.local')) {
                  targetEmail = primaryEmail;
                  console.log(`✅ Получен реальный email из GitHub API: ${targetEmail}`);
                }
              }
            } else if (response.ok) {
              const emailData = await response.json();
              const primaryEmail = emailData.find((e: any) => e.primary)?.email || emailData.find((e: any) => e.verified)?.email || emailData[0]?.email;
              if (primaryEmail && !primaryEmail.includes('.local')) {
                targetEmail = primaryEmail;
                console.log(`✅ Получен реальный email из GitHub API: ${targetEmail}`);
              }
            }
          } catch (error) {
            console.error(`❌ Ошибка получения email из GitHub API:`, error);
          }
        }
        
        // Если все еще псевдо-email и передан валидный email параметром
        if ((targetEmail?.includes('.local') || !targetEmail) && email && email.includes('@') && !email.includes('.local')) {
          targetEmail = email;
          console.log(`📧 Используем переданный email параметром: ${targetEmail}`);
        }
      }
      
      // Финальная проверка - если email все еще невалидный
      if (!targetEmail || targetEmail.includes('.local')) {
        console.error(`❌ Не удалось найти реальный email для userId ${userId}, userEmail=${userEmail}, targetEmail=${targetEmail}`);
        return {
          success: false,
          message: 'Email не привязан или не подтвержден. Для отправки кода нужен реальный email адрес. Убедитесь, что GitHub аккаунт привязан и email подтвержден на GitHub.',
        };
      }

      // ВАЖНО: Для nFA не ограничиваем отправку кодов, так как коды отправляются для всех методов одновременно
      // Rate limit проверяем только для обычной 2FA (не nFA)
      // Для nFA можно отправлять сколько угодно кодов, так как это часть процесса входа

      // Генерируем код
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

      // Сохраняем код
      await this.twoFactorCodeRepo.save({
        userId,
        code,
        type: 'email' as any,
        expiresAt,
        contact: targetEmail,
        status: 'pending' as any,
      });

      // Отправляем email с кодом на реальный email
      try {
        await this.emailService.sendVerificationCode(targetEmail, code);
        console.log(`📧 2FA код отправлен на email: ${targetEmail}`);
      } catch (error) {
        console.error(`❌ Ошибка отправки email на ${targetEmail}:`, error);
        // Продолжаем - код сохранен, даже если отправка не удалась (SMTP может быть не настроен)
        // Но возвращаем success=false чтобы пользователь знал что код не отправлен
        return {
          success: false,
          message: `Ошибка отправки email на ${targetEmail}. Проверьте настройки SMTP или свяжитесь с администратором.`,
        };
      }

      return {
        success: true,
        message: 'Код отправлен на email',
      };
    } catch (error) {
      console.error('❌ Ошибка отправки 2FA кода на email:', error);
      return {
        success: false,
        message: 'Ошибка отправки кода',
      };
    }
  }

  /**
   * Проверка 2FA кода
   */
  async verifyEmailCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const codeRecord = await this.twoFactorCodeRepo.findOne({
        where: {
          userId,
          code,
          type: 'email' as any,
          status: 'pending' as any,
        },
      });

      if (!codeRecord) {
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

      // Обновляем статус пользователя
      await this.userRepo.update(userId, { emailVerified: true });

      console.log(`✅ Email 2FA код подтвержден для пользователя ${userId}`);

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

  /**
   * Поиск пользователя по email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    console.log(`🔍 Поиск пользователя по email: ${email}`);
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['organizations', 'teams'],
    });
    console.log(`🔍 Результат поиска: ${user ? 'найден' : 'не найден'}`);
    return user;
  }

  /**
   * Генерация токенов для пользователя
   */
  async generateTokensForUser(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    // Генерируем Access Token
    const permissions = user.userRoleAssignments?.flatMap(assignment => 
      assignment.role?.permissions?.map(p => p.name) || []
    ) || [];
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      organizationId: user.organizations?.[0]?.id || null,
      teamId: user.teams?.[0]?.id || null,
      roles: user.userRoleAssignments?.map(a => a.role?.name).filter(Boolean) || [],
      permissions,
    });

    // Генерируем Refresh Token
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // +7 дней

    await this.refreshTokenRepo.save({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      isRevoked: false,
    });

    return { accessToken, refreshToken };
  }
}
