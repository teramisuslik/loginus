import { Injectable } from '@nestjs/common';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';

@Injectable()
export class GitHubAuthMicroModuleService {
  constructor(
    private readonly microModuleSettingsService: MicroModuleSettingsService,
  ) {}

  /**
   * Проверка, включен ли модуль GitHub авторизации
   */
  async isEnabled(): Promise<boolean> {
    return this.microModuleSettingsService.getModuleStatus('github-auth');
  }

  /**
   * Получение конфигурации модуля
   */
  async getConfig(): Promise<Record<string, any>> {
    const config = await this.microModuleSettingsService.getModuleConfig('github-auth');
    return {
      enabled: await this.isEnabled(),
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI,
      ...config,
    };
  }

  /**
   * Включение/выключение модуля
   */
  async toggle(enabled: boolean): Promise<void> {
    await this.microModuleSettingsService.toggleModule('github-auth', enabled);
    console.log(`GitHub Auth Module ${enabled ? 'enabled' : 'disabled'}`);
  }
}