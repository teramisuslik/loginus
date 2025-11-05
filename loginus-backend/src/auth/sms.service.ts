import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private smsruApiId: string;
  private smsaeroEmail: string;
  private smsaeroApiKey: string;
  private telegramBotToken: string;
  private telegramChatId: string;

  constructor(private configService: ConfigService) {
    this.smsruApiId = this.configService.get('SMSRU_API_ID', '');
    this.smsaeroEmail = this.configService.get('SMSAERO_EMAIL', '');
    this.smsaeroApiKey = this.configService.get('SMSAERO_API_KEY', '');
    this.telegramBotToken = this.configService.get('TELEGRAM_BOT_TOKEN', '');
    this.telegramChatId = this.configService.get('TELEGRAM_CHAT_ID', '');
    
    console.log('📱 SmsService инициализирован:');
    console.log(`   SmsAero Email: ${this.smsaeroEmail ? 'настроен' : 'не настроен'} (${this.smsaeroEmail})`);
    console.log(`   SmsAero API Key: ${this.smsaeroApiKey ? 'настроен' : 'не настроен'} (${this.smsaeroApiKey ? this.smsaeroApiKey.substring(0, 10) + '...' : 'пусто'})`);
    console.log(`   Telegram Bot Token: ${this.telegramBotToken ? 'настроен' : 'не настроен'} (${this.telegramBotToken ? this.telegramBotToken.substring(0, 10) + '...' : 'пусто'})`);
    console.log(`   Telegram Chat ID: ${this.telegramChatId ? 'настроен' : 'не настроен'} (${this.telegramChatId})`);
  }

  /**
   * Отправка кода подтверждения на SMS
   * Пробует SmsAero, затем Telegram, затем fallback
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const message = `Loginus: Ваш код подтверждения: ${code}. Код действителен 10 минут.`;
    
    // 1. Пробуем SmsAero
    if (this.smsaeroEmail && this.smsaeroApiKey) {
      try {
        await this.sendSmsViaSmsaero(phone, message);
        console.log(`📱 SMS отправлено через SmsAero на ${phone}`);
        console.log(`   Код: ${code}`);
        return;
      } catch (error) {
        console.error('❌ Ошибка отправки SMS через SmsAero:', error.message);
      }
    }

    // 2. Пробуем Telegram (временно отключен)
    // if (this.telegramBotToken && this.telegramChatId) {
    //   try {
    //     await this.sendSmsViaTelegram(phone, message, code);
    //     console.log(`📱 SMS отправлено через Telegram на ${phone}`);
    //     console.log(`   Код: ${code}`);
    //     return;
    //   } catch (error) {
    //     console.error('❌ Ошибка отправки SMS через Telegram:', error.message);
    //   }
    // }

    // 3. Fallback
    this.fallbackSms(phone, code);
  }

  /**
   * Отправка через SmsAero API
   */
  private async sendSmsViaSmsaero(phone: string, message: string): Promise<void> {
    const email = this.smsaeroEmail;
    const apiKey = this.smsaeroApiKey;
    const from = this.configService.get('SMSAERO_FROM', 'Loginus');
    
    const formattedPhone = this.formatPhoneForSmsaero(phone);
    
    // SmsAero API v1 - используем GET запрос с MD5 хешем пароля
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('md5').update(apiKey).digest('hex');
    
    console.log(`📱 Отправка SMS через SmsAero:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${apiKey ? apiKey.substring(0, 4) + '****' : 'пусто'}`);
    console.log(`   MD5 Hash: ${passwordHash}`);
    console.log(`   Phone: ${formattedPhone}`);
    console.log(`   Message: ${message}`);
    console.log(`   From: ${from}`);
    console.log(`   URL: https://gate.smsaero.ru/send/?user=${email}&password=${passwordHash}&to=${formattedPhone}&text=${encodeURIComponent(message)}&from=${from}&answer=json`);
    
    const params = new URLSearchParams({
      user: email,
      password: passwordHash,
      to: formattedPhone,
      text: message,
      from: from,
      answer: 'json'
    });
    
    const response = await fetch(`https://gate.smsaero.ru/send/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    console.log(`📱 SmsAero ответ: ${JSON.stringify(result, null, 2)}`);
    
    if (!result.success) {
      throw new Error(`SmsAero error: ${result.message || 'Unknown error'}`);
    }
  }

  /**
   * Отправка через Telegram Bot
   */
  private async sendSmsViaTelegram(phone: string, message: string, code: string): Promise<void> {
    const botToken = this.telegramBotToken;
    const chatId = this.telegramChatId;
    
    const telegramMessage = `📱 SMS для ${phone}\n\n${message}\n\n🔐 Код: ${code}`;
    
    console.log(`📱 Отправка SMS через Telegram:`);
    console.log(`   Bot Token: ${botToken.substring(0, 10)}...`);
    console.log(`   Chat ID: ${chatId}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Code: ${code}`);
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    
    console.log(`📱 Telegram ответ: ${JSON.stringify(result, null, 2)}`);
    
    if (!result.ok) {
      throw new Error(`Telegram error: ${result.description || 'Unknown error'}`);
    }
  }

  /**
   * Форматирование номера для SmsAero
   */
  private formatPhoneForSmsaero(phone: string): string {
    // Убираем все символы кроме цифр
    let digits = phone.replace(/\D/g, '');
    
    // Если номер начинается с 8, заменяем на 7
    if (digits.startsWith('8')) {
      digits = '7' + digits.substring(1);
    }
    
    // Если номер начинается с +7, убираем +
    if (digits.startsWith('7')) {
      return digits;
    }
    
    // Если номер не начинается с 7, добавляем 7
    if (!digits.startsWith('7')) {
      return '7' + digits;
    }
    
    return digits;
  }

  /**
   * Fallback SMS (в консоль)
   */
  private fallbackSms(phone: string, code: string): void {
    console.log('📱 ===== FALLBACK SMS (SmsAero и Telegram не настроены) =====');
    console.log(`   To: ${phone}`);
    console.log(`   Message: Loginus: Ваш код подтверждения: ${code}. Код действителен 10 минут.`);
    console.log(`   Code: ${code}`);
    console.log('📱 ============================================================');
  }

  /**
   * Валидация номера телефона
   */
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Форматирование номера телефона
   */
  formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.startsWith('8')) {
      return '+7' + digits.substring(1);
    }
    
    if (digits.startsWith('7')) {
      return '+' + digits;
    }
    
    if (!digits.startsWith('7') && !digits.startsWith('8')) {
      return '+7' + digits;
    }
    
    return '+' + digits;
  }

  /**
   * Тестирование всех SMS сервисов
   */
  async testAllServices(phone: string, code: string): Promise<void> {
    console.log('🧪 Тестирование всех SMS сервисов...');
    console.log(`   SmsAero Email: "${this.smsaeroEmail}"`);
    console.log(`   SmsAero API Key: "${this.smsaeroApiKey ? this.smsaeroApiKey.substring(0, 10) + '...' : 'пусто'}"`);
    console.log(`   Telegram Bot Token: "${this.telegramBotToken ? this.telegramBotToken.substring(0, 10) + '...' : 'пусто'}"`);
    console.log(`   Telegram Chat ID: "${this.telegramChatId}"`);
    
    // Тест SmsAero
    if (this.smsaeroEmail && this.smsaeroApiKey) {
      try {
        await this.sendSmsViaSmsaero(phone, `Тест SmsAero: ${code}`);
        console.log('✅ SmsAero работает');
      } catch (error) {
        console.log('❌ SmsAero не работает:', error.message);
      }
    } else {
      console.log('⚠️ SmsAero не настроен');
    }

    // Тест Telegram
    if (this.telegramBotToken && this.telegramChatId) {
      try {
        await this.sendSmsViaTelegram(phone, `Тест Telegram: ${code}`, code);
        console.log('✅ Telegram работает');
      } catch (error) {
        console.log('❌ Telegram не работает:', error.message);
      }
    } else {
      console.log('⚠️ Telegram не настроен');
    }
  }

  /**
   * Отправка сообщения через Telegram
   * ВАЖНО: Бот может отправлять сообщения только если:
   * 1. Пользователь начал диалог с ботом ранее
   * 2. Пользователь авторизовался через Telegram Login Widget (в этом случае бот автоматически получает право отправлять сообщения)
   */
  async sendTelegramMessage(chatId: string, message: string): Promise<{ success: boolean; message: string }> {
    if (!this.telegramBotToken) {
      console.error('❌ [sendTelegramMessage] Telegram Bot Token не настроен');
      return { success: false, message: 'Telegram Bot Token не настроен' };
    }

    try {
      console.log(`📤 [sendTelegramMessage] Отправка сообщения в Telegram`);
      console.log(`📤 [sendTelegramMessage] chatId: ${chatId} (тип: ${typeof chatId})`);
      console.log(`📤 [sendTelegramMessage] message длина: ${message?.length || 0}`);
      console.log(`📤 [sendTelegramMessage] message preview: ${message?.substring(0, 100) || 'EMPTY'}...`);
      
      // Преобразуем chatId в число, если это строка с числом (Telegram API принимает числа)
      let numericChatId: number | string = chatId;
      if (typeof chatId === 'string' && /^\d+$/.test(chatId)) {
        numericChatId = parseInt(chatId, 10);
      }
      
      const requestBody = {
        chat_id: numericChatId,
        text: message,
      };
      
      console.log(`📤 [sendTelegramMessage] Request body: ${JSON.stringify({ ...requestBody, text: requestBody.text.substring(0, 50) + '...' })}`);
      
      // ✅ ИСПРАВЛЕНИЕ: Добавляем таймаут и повторные попытки для надежности доставки
      // Telegram API может иметь задержки, поэтому увеличиваем таймаут и добавляем retry логику
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📤 [sendTelegramMessage] Попытка ${attempt} из ${maxRetries} для chatId ${chatId}`);
          
          // Создаем AbortController для таймаута (30 секунд на попытку)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const response = await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          const data = await response.json();
      
          // ✅ УЛУЧШЕННОЕ ЛОГИРОВАНИЕ: Логируем полный ответ для диагностики
          console.log(`📤 [sendTelegramMessage] Telegram API ответ для chatId ${chatId} (попытка ${attempt}):`, JSON.stringify(data, null, 2));
          console.log(`📤 [sendTelegramMessage] Статус ответа: ok=${data.ok}, error_code=${data.error_code || 'none'}, message_id=${data.result?.message_id || 'none'}`);
          
          // Обработка ошибки 429 (Too Many Requests) - повторяем запрос с задержкой
          if (data.error_code === 429) {
            const retryAfter = data.parameters?.retry_after || 1; // Задержка в секундах
            console.warn(`⚠️ [sendTelegramMessage] Telegram API rate limit (429), ждем ${retryAfter} секунд перед следующей попыткой`);
            
            // Если это не последняя попытка, ждем и повторяем
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              continue; // Повторяем попытку
            } else {
              // Последняя попытка - возвращаем ошибку
              return { success: false, message: `Rate limit после ${maxRetries} попыток. Попробуйте позже.` };
            }
          }
          
          // ✅ ИСПРАВЛЕНИЕ: Проверяем статус ответа более тщательно
          if (data.ok === true) {
            console.log(`✅ [sendTelegramMessage] Telegram API вернул ok=true для chatId ${chatId} (попытка ${attempt})`);
            
            // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что message_id присутствует в ответе
            // Это означает, что Telegram действительно получил и обработал сообщение
            if (data.result && data.result.message_id) {
              console.log(`✅ [sendTelegramMessage] Подтверждение доставки: message_id=${data.result.message_id}, chat_id=${data.result.chat?.id || 'unknown'}`);
              console.log(`✅ [sendTelegramMessage] Полная информация о сообщении:`, JSON.stringify({
                message_id: data.result.message_id,
                chat_id: data.result.chat?.id,
                date: data.result.date,
                text_length: data.result.text?.length
              }));
              return { success: true, message: 'Сообщение отправлено' };
            } else {
              console.warn(`⚠️ [sendTelegramMessage] Ответ ok=true, но message_id отсутствует. Структура ответа:`, JSON.stringify(data.result || 'null'));
              // Если это не последняя попытка, повторяем
              if (attempt < maxRetries) {
                console.log(`🔄 [sendTelegramMessage] Повторяем попытку ${attempt + 1} из-за отсутствия message_id`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Короткая задержка перед повтором
                continue;
              } else {
                // Последняя попытка - все равно считаем успешным, если ok=true
                console.warn(`⚠️ [sendTelegramMessage] Все попытки исчерпаны, но ok=true. Возвращаем успех без message_id.`);
                return { success: true, message: 'Сообщение отправлено (подтверждение доставки не получено)' };
              }
            }
          } else {
            // Ошибка от Telegram API
            console.error(`❌ [sendTelegramMessage] Ошибка отправки Telegram сообщения (попытка ${attempt}):`, JSON.stringify(data));
            lastError = data;
            
            // Если это не последняя попытка и ошибка не критическая, повторяем
            if (attempt < maxRetries) {
              const errorCode = data.error_code;
              // Не повторяем для критических ошибок (403, 400, 401)
              if (errorCode === 403 || errorCode === 400 || errorCode === 401) {
                break; // Выходим из цикла, не повторяем
              }
              
              // Задержка перед следующей попыткой (1-2 секунды)
              const delay = attempt * 1000; // Экспоненциальная задержка
              console.log(`⏳ [sendTelegramMessage] Ожидание ${delay}ms перед повторной попыткой...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
        } catch (fetchError: any) {
          console.error(`❌ [sendTelegramMessage] Ошибка сети при попытке ${attempt}:`, fetchError.message);
          lastError = fetchError;
          
          // Если это не последняя попытка и ошибка не критическая (таймаут или сеть), повторяем
          if (attempt < maxRetries && (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout') || fetchError.message?.includes('network'))) {
            const delay = attempt * 1000;
            console.log(`⏳ [sendTelegramMessage] Ожидание ${delay}ms перед повторной попыткой из-за сетевой ошибки...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Если это последняя попытка или критическая ошибка, выходим
          if (attempt === maxRetries) {
            break;
          }
        }
      }
      
      // Если мы дошли сюда, все попытки исчерпаны
      console.error('❌ [sendTelegramMessage] Все попытки исчерпаны для chatId:', chatId);
      
      // Детализируем последнюю ошибку
      if (lastError) {
        let errorMessage = lastError.description || lastError.message || 'Ошибка отправки после всех попыток';
        if (lastError.error_code === 403) {
          errorMessage = 'Бот заблокирован пользователем или не может начать диалог. Убедитесь, что вы авторизовались через Telegram Login Widget.';
        } else if (lastError.error_code === 400) {
          errorMessage = 'Неверный chatId или пользователь не авторизовался через Telegram Login Widget';
        } else if (lastError.error_code === 401) {
          errorMessage = 'Неверный токен Telegram бота';
        }
        return { success: false, message: errorMessage };
      }
      
      return { success: false, message: 'Ошибка отправки после всех попыток' };
    } catch (error) {
      console.error('❌ [sendTelegramMessage] Ошибка при отправке Telegram сообщения:', error);
      return { success: false, message: `Ошибка сети: ${error.message}` };
    }
  }

  /**
   * Отправка SMS сообщения (алиас для совместимости)
   */
  async sendSmsMessage(phone: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.sendVerificationCode(phone, message.split(': ')[1] || '123456');
      return { success: true, message: 'SMS отправлено' };
    } catch (error) {
      return { success: false, message: 'Ошибка отправки SMS' };
    }
  }
}