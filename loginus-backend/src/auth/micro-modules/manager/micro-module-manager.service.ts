import { Injectable, OnModuleInit } from '@nestjs/common';
import { MicroModule, AuthMicroModule } from '../../../common/interfaces/micro-module.interface';
import { GitHubAuthMicroModuleService } from '../github-auth/github-auth.service';
import { TelegramAuthMicroModuleService } from '../telegram-auth/telegram-auth.service';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';

@Injectable() // По умолчанию singleton в NestJS
export class MicroModuleManagerService implements OnModuleInit {
  // Используем обычный instance field - NestJS гарантирует singleton для Injectable сервисов
  private modulesRegistry: Map<string, MicroModule> = new Map();
  
  private readonly instanceId: string = Math.random().toString(36).substring(2, 15); // Уникальный ID экземпляра

  constructor(
    private readonly githubAuthService: GitHubAuthMicroModuleService,
    private readonly telegramAuthService: TelegramAuthMicroModuleService,
    private readonly microModuleSettingsService: MicroModuleSettingsService,
  ) {
    console.log(`🔧 MicroModuleManagerService constructor called, instanceId: ${this.instanceId}`);
  }

  async onModuleInit() {
    console.log(`🔧 MicroModuleManager инициализирован, instanceId: ${this.instanceId}, modules count: ${this.modulesRegistry.size}`);
  }

  /**
   * Регистрация микромодуля
   */
  registerModule(module: MicroModule): void {
    const moduleName = module.name;
    console.log(`📝 [registerModule] Before: registry size = ${this.modulesRegistry.size}, instanceId: ${this.instanceId}`);
    this.modulesRegistry.set(moduleName, module);
    console.log(`📝 [registerModule] After: registry size = ${this.modulesRegistry.size}`);
    console.log(`✅ Микромодуль ${moduleName} зарегистрирован в экземпляре ${this.instanceId}, всего модулей: ${this.modulesRegistry.size}`);
    console.log(`📝 [registerModule] Registry keys:`, Array.from(this.modulesRegistry.keys()));
  }

  /**
   * Отключение микромодуля
   */
  unregisterModule(moduleName: string): boolean {
    const module = this.modulesRegistry.get(moduleName);
    if (module) {
      this.modulesRegistry.delete(moduleName);
      console.log(`❌ Микромодуль ${moduleName} отключен`);
      return true;
    }
    return false;
  }

  /**
   * Получение микромодуля по имени
   */
  getModule(moduleName: string): MicroModule | undefined {
    return this.modulesRegistry.get(moduleName);
  }

  /**
   * Получение всех микромодулей
   */
  getAllModules(): MicroModule[] {
    console.log(`🔍 [MicroModuleManagerService] getAllModules called, instanceId: ${this.instanceId}, modules count: ${this.modulesRegistry.size}`);
    const modules = Array.from(this.modulesRegistry.values());
    console.log(`🔍 [MicroModuleManagerService] Returning ${modules.length} modules:`, modules.map(m => m.name));
    return modules;
  }

  /**
   * Получение активных микромодулей
   */
  getActiveModules(): MicroModule[] {
    return this.getAllModules().filter(module => module.isEnabled);
  }

  /**
   * Получение модулей аутентификации
   */
  getAuthModules(): AuthMicroModule[] {
    return this.getAllModules().filter(
      (module): module is AuthMicroModule => 'authMethods' in module
    ) as AuthMicroModule[];
  }

  /**
   * Получение статистики микромодулей
   */
  getModulesStats() {
    const total = this.modulesRegistry.size;
    const active = this.getActiveModules().length;
    
    return {
      total,
      active,
      inactive: total - active,
      byType: {
        'auth': this.getAuthModules().length,
      }
    };
  }

  /**
   * Получение статуса микромодулей авторизации
   * ВАЖНО: Использует getModuleStatus напрямую из БД, а не через сервисы модулей
   */
  async getAuthModulesStatus() {
    console.log('[MicroModuleManagerService] getAuthModulesStatus called');
    console.log('[MicroModuleManagerService] microModuleSettingsService:', !!this.microModuleSettingsService);
    
    // Используем getModuleStatus напрямую из БД для всех модулей
    const [emailEnabled, githubEnabled, telegramEnabled] = await Promise.all([
      this.microModuleSettingsService.getModuleStatus('email-auth'),
      this.microModuleSettingsService.getModuleStatus('github-auth'),
      this.microModuleSettingsService.getModuleStatus('telegram-auth'),
    ]);
    
    console.log('[MicroModuleManagerService] Status from DB:', { emailEnabled, githubEnabled, telegramEnabled });
    
    return {
      email: {
        enabled: emailEnabled,
        isSystem: true,
        version: '1.0.0',
        description: 'Вход в систему по email и паролю',
        permissions: [
          'auth.email.login',
          'auth.email.register',
          'auth.email.reset-password',
        ],
      },
      github: {
        enabled: githubEnabled,
        isSystem: false,
        version: '1.0.0',
        description: 'Вход в систему через GitHub OAuth',
        permissions: [
          'auth.github.login',
          'auth.github.register',
          'auth.github.bind',
          'auth.github.unbind',
        ],
      },
      telegram: {
        enabled: telegramEnabled,
        isSystem: false,
        version: '1.0.0',
        description: 'Вход в систему через Telegram Bot',
        permissions: [
          'auth.telegram.login',
          'auth.telegram.register',
          'auth.telegram.bind',
          'auth.telegram.unbind',
        ],
      },
    };
  }
}
