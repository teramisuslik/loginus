import { Injectable } from '@nestjs/common';
import { BaseAuthMicroModule } from '../../../common/base/base-micro-module';
import { UIElement } from '../../../common/interfaces/ui-element.interface';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';

@Injectable()
export class GitHubAuthMicroModule extends BaseAuthMicroModule {
  readonly name = 'github-auth';
  readonly version = '1.0.0';
  readonly displayName = 'Авторизация через GitHub';
  readonly description = 'Вход в систему через GitHub OAuth';
  readonly isEnabled = true; // Базовое значение, реальный статус получаем через getEnabledStatus()
  readonly isSystem = false;
  readonly dependencies: string[] = [];
  readonly permissions = [
    'auth.github.login',
    'auth.github.register',
    'auth.github.bind',
    'auth.github.unbind',
  ];
  readonly uiElements: UIElement[] = [
    {
      id: 'github-login-button',
      component: 'GitHubLoginButton',
      path: '/auth/github',
      displayName: 'Кнопка входа через GitHub',
      description: 'Кнопка для входа в систему через GitHub',
      requiredPermissions: [],
      requiredRoles: [],
      conditions: {
        featureEnabled: 'github-auth',
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
      id: 'github-login-page',
      component: 'GitHubLoginPage',
      path: '/github-login.html',
      displayName: 'Страница входа через GitHub',
      description: 'Страница для входа в систему через GitHub',
      requiredPermissions: [],
      requiredRoles: [],
      conditions: {
        featureEnabled: 'github-auth',
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
  readonly authMethods = ['github'];

  constructor(private readonly microModuleSettingsService: MicroModuleSettingsService) {
    super();
  }

  async getEnabledStatus(): Promise<boolean> {
    return this.microModuleSettingsService.getModuleStatus('github-auth');
  }

  protected async onInitialize(): Promise<void> {
    // Инициализация модуля GitHub аутентификации
    this.logInitialization();
  }

  protected async onDestroy(): Promise<void> {
    // Очистка ресурсов модуля
    this.logDestruction();
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    // GitHub OAuth валидация происходит на уровне OAuth провайдера
    return true;
  }

  async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    // Токены генерируются в основном AuthService
    return {
      accessToken: 'mock-github-access-token',
      refreshToken: 'mock-github-refresh-token',
    };
  }
}