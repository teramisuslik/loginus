import { Controller, Get, Post, Body } from '@nestjs/common';
import { GitHubAuthMicroModuleService } from './github-auth.service';

@Controller('micro-modules/github-auth')
export class GitHubAuthMicroModuleController {
  constructor(
    private readonly githubAuthService: GitHubAuthMicroModuleService,
  ) {}

  /**
   * Получение статуса модуля
   */
  @Get('status')
  async getStatus() {
    return {
      enabled: await this.githubAuthService.isEnabled(),
      config: await this.githubAuthService.getConfig(),
    };
  }

  /**
   * Включение/выключение модуля
   */
  @Post('toggle')
  async toggle(@Body() body: { enabled: boolean }) {
    await this.githubAuthService.toggle(body.enabled);
    return { success: true, enabled: body.enabled };
  }

  /**
   * Получение конфигурации модуля
   */
  @Get('config')
  async getConfig() {
    return this.githubAuthService.getConfig();
  }
}