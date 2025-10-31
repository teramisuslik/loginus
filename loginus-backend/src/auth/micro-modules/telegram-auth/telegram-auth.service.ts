import { Injectable } from '@nestjs/common';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';

@Injectable()
export class TelegramAuthMicroModuleService {
  constructor(
    private readonly microModuleSettingsService: MicroModuleSettingsService,
  ) {}

  /**
   * Проверка, включен ли модуль Telegram авторизации
   */
  async isEnabled(): Promise<boolean> {
    return this.microModuleSettingsService.getModuleStatus('telegram-auth');
  }

  /**
   * Получение конфигурации модуля
   */
  async getConfig(): Promise<Record<string, any>> {
    const config = await this.microModuleSettingsService.getModuleConfig('telegram-auth');
    return {
      enabled: await this.isEnabled(),
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      botUsername: process.env.TELEGRAM_BOT_USERNAME,
      ...config,
    };
  }

  /**
   * Включение/выключение модуля
   */
  async toggle(enabled: boolean): Promise<void> {
    await this.microModuleSettingsService.toggleModule('telegram-auth', enabled);
    console.log(`Telegram Auth Module ${enabled ? 'enabled' : 'disabled'}`);
  }
}