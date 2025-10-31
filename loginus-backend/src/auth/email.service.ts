import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  /**
   * Создание транспортера для отправки email
   */
  private createTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = parseInt(this.configService.get('SMTP_PORT', '587'), 10);
    const smtpUser = this.configService.get('SMTP_USER', 'your-email@gmail.com');
    const smtpPassword = this.configService.get('SMTP_PASSWORD', 'your-app-password');
    
    // Для Yandex: используем secure: false для порта 587 (STARTTLS)
    // Для порта 465 нужно secure: true
    const isYandex = smtpHost.includes('yandex');
    const isSecure = smtpPort === 465;
    
    const smtpConfig: any = {
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    };

    // Для Yandex добавляем дополнительные настройки
    if (isYandex && !isSecure) {
      smtpConfig.requireTLS = true;
      smtpConfig.tls = {
        rejectUnauthorized: false, // ВНИМАНИЕ: только для тестирования, в продакшене должно быть true
      };
    }

    console.log('📧 SMTP Config:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth.user,
      pass: smtpConfig.auth.pass ? '***' : 'NOT_SET',
      isYandex,
      requireTLS: smtpConfig.requireTLS,
    });

    // Проверяем наличие пароля
    if (!smtpPassword || smtpPassword === 'your-app-password') {
      console.error('❌ SMTP_PASSWORD не настроен! Для Yandex нужно создать пароль приложения:');
      console.error('   1. Перейдите: https://id.yandex.ru/security');
      console.error('   2. Включите "Пароли приложений"');
      console.error('   3. Создайте пароль для "Почта"');
      console.error('   4. Используйте этот пароль в SMTP_PASSWORD');
    }

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Проверяем соединение
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Connection Error:', error);
        if ((error as any).code === 'EAUTH') {
          console.error('❌ ОШИБКА АУТЕНТИФИКАЦИИ SMTP:');
          console.error('   Это означает, что логин или пароль неверны.');
          if (isYandex) {
            console.error('   ⚠️  Для Yandex нужно использовать ПАРОЛЬ ПРИЛОЖЕНИЯ, а не основной пароль!');
            console.error('   📋 Инструкция:');
            console.error('      1. https://id.yandex.ru/security');
            console.error('      2. Включите "Пароли приложений"');
            console.error('      3. Создайте пароль для "Почта"');
            console.error('      4. Используйте этот пароль в переменной SMTP_PASSWORD');
          }
        }
      } else {
        console.log('✅ SMTP Server is ready to take our messages');
      }
    });
  }

  /**
   * Отправка кода подтверждения на email
   */
  async sendVerificationCode(email: string, code: string, method?: string): Promise<void> {
    const subject = method === 'github' ? 'Код подтверждения Loginus (GitHub)' : 'Код подтверждения Loginus';
    const html = this.generateEmailTemplate(code, method);
    const from = this.configService.get('SMTP_FROM', 'noreply@loginus.ru');
    
    console.log(`📧 [sendVerificationCode] Начинаем отправку email:`);
    console.log(`   To: ${email}`);
    console.log(`   From: ${from}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Code: ${code}`);
    console.log(`   Transporter готов: ${this.transporter ? 'да' : 'нет'}`);
    
    try {
      // Отправляем реальное письмо
      const info = await this.transporter.sendMail({
        from: from,
        to: email,
        subject,
        html,
      });

      console.log(`✅ [sendVerificationCode] Email отправлен успешно на ${email}`);
      console.log(`   Код: ${code}`);
      console.log(`   От: ${from}`);
      console.log(`   SMTP MessageId: ${info.messageId || 'N/A'}`);
      console.log(`   SMTP Response: ${info.response || 'OK'}`);
      console.log(`   SMTP Accepted: ${JSON.stringify(info.accepted || [])}`);
      console.log(`   SMTP Rejected: ${JSON.stringify(info.rejected || [])}`);
    } catch (error) {
      console.error('❌ [sendVerificationCode] Ошибка отправки email:', error);
      console.error('❌ [sendVerificationCode] Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        command: error?.command,
        response: error?.response,
        responseCode: error?.responseCode,
        stack: error?.stack
      });
      
      // Fallback - показываем код в логах если отправка не удалась
      console.log('📧 [sendVerificationCode] Fallback - код в логах:');
      console.log(`   To: ${email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Code: ${code}`);
      throw error; // Пробрасываем ошибку дальше
    }
  }

  /**
   * Универсальный метод отправки email
   */
  async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@loginus.ru'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`📧 Email отправлен на ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      
      // Fallback - показываем данные в логах если отправка не удалась
      console.log('📧 Fallback - данные в логах:');
      console.log(`   To: ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
    }
  }

  /**
   * Отправка письма подтверждения email
   */
  async sendEmailVerification(email: string, verificationLink: string): Promise<void> {
    const subject = '📧 Подтверждение email - Loginus';
    const html = this.generateEmailVerificationTemplate(verificationLink);
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@loginus.ru'),
        to: email,
        subject,
        html,
      });

      console.log(`📧 Письмо подтверждения email отправлено на ${email}`);
      console.log(`   Ссылка: ${verificationLink}`);
    } catch (error) {
      console.error('❌ Ошибка отправки письма подтверждения email:', error);
      
      // Fallback - показываем ссылку в логах если отправка не удалась
      console.log('📧 Fallback - ссылка в логах:');
      console.log(`   To: ${email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Link: ${verificationLink}`);
    }
  }

  /**
   * Отправка email для восстановления пароля
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const subject = '🔐 Восстановление пароля - Loginus';
    const html = this.generatePasswordResetTemplate(resetLink);
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@loginus.ru'),
        to: email,
        subject,
        html,
      });

      console.log(`📧 Email для восстановления пароля отправлен на ${email}`);
      console.log(`   Ссылка: ${resetLink}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email для восстановления пароля:', error);
      
      // Fallback - показываем ссылку в логах если отправка не удалась
      console.log('📧 Fallback - ссылка в логах:');
      console.log(`   To: ${email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Link: ${resetLink}`);
    }
  }

  /**
   * Генерация HTML шаблона для email
   */
  private generateEmailTemplate(code: string, method?: string): string {
    const methodLabel = method === 'github' ? ' (GitHub)' : '';
    const methodNote = method === 'github' ? '<p><strong>📧 Это код подтверждения для метода входа через GitHub.</strong></p>' : '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Код подтверждения Loginus${methodLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
          .header img { max-width: 150px; }
          .content { padding: 20px 0; text-align: center; }
          .code { font-size: 32px; font-weight: bold; color: #007bff; margin: 20px 0; padding: 10px 20px; background-color: #e9f5ff; border-radius: 4px; display: inline-block; }
          .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; }
          .warning { color: #dc3545; font-weight: bold; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://example.com/loginus-logo.png" alt="Loginus Logo"> <!-- Замените на реальный URL логотипа -->
            <h1>Подтверждение аккаунта Loginus${methodLabel}</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Вы запросили код подтверждения для входа в ваш аккаунт Loginus. Используйте следующий код:</p>
            ${methodNote}
            <div class="code">${code}</div>
            <p>Этот код действителен в течение 10 минут.</p>
            <p class="warning">Никому не сообщайте этот код. Сотрудники Loginus никогда не попросят ваш код подтверждения.</p>
            <p>Если вы не запрашивали этот код, пожалуйста, проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Loginus. Все права защищены.</p>
            <p>Служба поддержки: <a href="mailto:support@loginus.ru">support@loginus.ru</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Генерация HTML шаблона для подтверждения email
   */
  private generateEmailVerificationTemplate(verificationLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Подтверждение email - Loginus</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
          .header img { max-width: 150px; }
          .content { padding: 20px 0; text-align: center; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #3730A3; }
          .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; }
          .warning { background: #D1FAE5; border: 1px solid #10B981; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
          .link { word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 10px 0; }
          .benefits { background: #F0F9FF; border: 1px solid #0EA5E9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://example.com/loginus-logo.png" alt="Loginus Logo">
            <h1>📧 Подтверждение email</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Для завершения регистрации в системе Loginus необходимо подтвердить ваш email адрес.</p>
            <p>Нажмите на кнопку ниже для подтверждения:</p>
            <div>
              <a href="${verificationLink}" class="button">Подтвердить email</a>
            </div>
            <div class="warning">
              <p><strong>✅ После подтверждения email:</strong></p>
              <ul>
                <li>Ваша роль будет повышена до <strong>editor</strong></li>
                <li>Вы получите дополнительные права доступа</li>
                <li>Ссылка действительна <strong>24 часа</strong></li>
              </ul>
            </div>
            <div class="benefits">
              <p><strong>🎯 Преимущества роли editor:</strong></p>
              <ul>
                <li>Создание и редактирование материалов базы знаний</li>
                <li>Управление клиентами</li>
                <li>Доступ к расширенным функциям системы</li>
              </ul>
            </div>
            <p>Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
            <div class="link">${verificationLink}</div>
            <p>Если вы не регистрировались в системе Loginus, проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Loginus. Все права защищены.</p>
            <p>Служба поддержки: <a href="mailto:support@loginus.ru">support@loginus.ru</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Отправка email приглашения
   */
  async sendInvitationEmail(
    email: string, 
    inviterEmail: string, 
    invitationLink: string, 
    message?: string
  ): Promise<void> {
    const subject = '🎉 Приглашение в команду - Loginus';
    const html = this.generateInvitationTemplate(inviterEmail, invitationLink, message);
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@loginus.ru'),
        to: email,
        subject,
        html,
      });

      console.log(`📧 Приглашение отправлено на ${email}`);
      console.log(`   От: ${inviterEmail}`);
      console.log(`   Ссылка: ${invitationLink}`);
    } catch (error) {
      console.error('❌ Ошибка отправки приглашения:', error);
      
      // Fallback - показываем ссылку в логах если отправка не удалась
      console.log('📧 Fallback - приглашение в логах:');
      console.log(`   To: ${email}`);
      console.log(`   From: ${inviterEmail}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Link: ${invitationLink}`);
    }
  }

  /**
   * Генерация HTML шаблона для приглашения
   */
  private generateInvitationTemplate(
    inviterEmail: string, 
    invitationLink: string, 
    message?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Приглашение в команду - Loginus</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
          .header img { max-width: 150px; }
          .content { padding: 20px 0; text-align: center; }
          .button { display: inline-block; background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #059669; }
          .button-decline { display: inline-block; background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; margin-left: 10px; }
          .button-decline:hover { background: #DC2626; }
          .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; }
          .invitation { background: #F0FDF4; border: 1px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
          .message { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; font-style: italic; }
          .link { word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 10px 0; }
          .benefits { background: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://example.com/loginus-logo.png" alt="Loginus Logo">
            <h1>🎉 Приглашение в команду</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <div class="invitation">
              <p><strong>${inviterEmail}</strong> приглашает вас присоединиться к команде в системе Vselena.</p>
              ${message ? `<div class="message"><p><strong>Сообщение от приглашающего:</strong></p><p>"${message}"</p></div>` : ''}
            </div>
            <p>Нажмите на кнопку ниже, чтобы принять приглашение:</p>
            <div>
              <a href="${invitationLink}?action=accept" class="button">✅ Принять приглашение</a>
              <a href="${invitationLink}?action=decline" class="button-decline">❌ Отклонить</a>
            </div>
            <div class="benefits">
              <p><strong>🚀 Преимущества участия в команде:</strong></p>
              <ul>
                <li>Доступ к общим ресурсам и документам</li>
                <li>Совместная работа над проектами</li>
                <li>Расширенные права доступа</li>
                <li>Участие в командных обсуждениях</li>
              </ul>
            </div>
            <p>Если кнопки не работают, используйте эти ссылки:</p>
            <div class="link">
              <strong>Принять:</strong> ${invitationLink}?action=accept<br>
              <strong>Отклонить:</strong> ${invitationLink}?action=decline
            </div>
            <p><strong>⏰ Приглашение действительно 7 дней.</strong></p>
            <p>Если вы не хотите присоединяться к команде, просто проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Loginus. Все права защищены.</p>
            <p>Служба поддержки: <a href="mailto:support@loginus.ru">support@loginus.ru</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Генерация HTML шаблона для восстановления пароля
   */
  private generatePasswordResetTemplate(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Восстановление пароля - Vselena</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
          .header img { max-width: 150px; }
          .content { padding: 20px 0; text-align: center; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #3730A3; }
          .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
          .link { word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://example.com/loginus-logo.png" alt="Loginus Logo">
            <h1>🔐 Восстановление пароля</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Вы запросили восстановление пароля для вашего аккаунта в системе Vselena.</p>
            <p>Для создания нового пароля нажмите на кнопку ниже:</p>
            <div>
              <a href="${resetLink}" class="button">Восстановить пароль</a>
            </div>
            <div class="warning">
              <p><strong>⚠️ Важно:</strong></p>
              <ul>
                <li>Ссылка действительна <strong>30 минут</strong></li>
                <li>Ссылка может быть использована <strong>только один раз</strong></li>
                <li>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо</li>
              </ul>
            </div>
            <p>Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
            <div class="link">${resetLink}</div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Loginus. Все права защищены.</p>
            <p>Служба поддержки: <a href="mailto:support@loginus.ru">support@loginus.ru</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}