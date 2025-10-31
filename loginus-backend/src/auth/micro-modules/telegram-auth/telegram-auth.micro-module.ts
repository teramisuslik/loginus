import { Injectable } from '@nestjs/common';
import { BaseAuthMicroModule } from '../../../common/base/base-micro-module';
import { UIElement } from '../../../common/interfaces/ui-element.interface';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';

@Injectable()
export class TelegramAuthMicroModule extends BaseAuthMicroModule {
  readonly name = 'telegram-auth';
  readonly version = '1.0.0';
  readonly displayName = 'Авторизация через Telegram';
  readonly description = 'Вход в систему через Telegram Bot';
  readonly isEnabled = true; // Базовое значение, реальный статус получаем через getEnabledStatus()
  readonly isSystem = false;
  readonly dependencies: string[] = [];
  readonly permissions = [
    'auth.telegram.login',
    'auth.telegram.register',
    'auth.telegram.bind',
    'auth.telegram.unbind',
  ];
  readonly uiElements: UIElement[] = [
    {
      id: 'telegram-login-button',
      component: 'TelegramLoginButton',
      path: '/auth/telegram',
      displayName: 'Кнопка входа через Telegram',
      description: 'Кнопка для входа в систему через Telegram',
      requiredPermissions: [],
      requiredRoles: [],
      conditions: {
        featureEnabled: 'telegram-auth',
      },
      priority: 100,
      isActive: true,
      metadata: {
        type: 'button',
        category: 'auth',
        hideWhenDisabled: true,
      },
    },
    {
      id: 'telegram-login-page',
      component: 'TelegramLoginPage',
      path: '/telegram-login.html',
      displayName: 'Страница входа через Telegram',
      description: 'Страница для входа в систему через Telegram',
      requiredPermissions: [],
      requiredRoles: [],
      conditions: {
        featureEnabled: 'telegram-auth',
      },
      priority: 90,
      isActive: true,
      metadata: {
        type: 'page',
        category: 'auth',
        hideWhenDisabled: true,
      },
    },
  ];
  readonly priority = 50;
  readonly authMethods = ['telegram'];

  constructor(private readonly microModuleSettingsService: MicroModuleSettingsService) {
    super();
  }

  async getEnabledStatus(): Promise<boolean> {
    return this.microModuleSettingsService.getModuleStatus('telegram-auth');
  }

  protected async onInitialize(): Promise<void> {
    // Инициализация модуля Telegram аутентификации
    this.logInitialization();
  }

  protected async onDestroy(): Promise<void> {
    // Очистка ресурсов модуля
    this.logDestruction();
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    // Telegram Bot валидация происходит на уровне Telegram API
    return true;
  }

  async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    // Токены генерируются в основном AuthService
    return {
      accessToken: 'mock-telegram-access-token',
      refreshToken: 'mock-telegram-refresh-token',
    };
  }
}