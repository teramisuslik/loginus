import { Controller, Get, Post, Body } from '@nestjs/common';
import { TelegramAuthMicroModuleService } from './telegram-auth.service';

@Controller('micro-modules/telegram-auth')
export class TelegramAuthMicroModuleController {
  constructor(
    private readonly telegramAuthService: TelegramAuthMicroModuleService,
  ) {}

  /**
   * Получение статуса модуля
   */
  @Get('status')
  async getStatus() {
    return {
      enabled: await this.telegramAuthService.isEnabled(),
      config: await this.telegramAuthService.getConfig(),
    };
  }

  /**
   * Включение/выключение модуля
   */
  @Post('toggle')
  async toggle(@Body() body: { enabled: boolean }) {
    await this.telegramAuthService.toggle(body.enabled);
    return { success: true, enabled: body.enabled };
  }

  /**
   * Получение конфигурации модуля
   */
  @Get('config')
  async getConfig() {
    return this.telegramAuthService.getConfig();
  }
}