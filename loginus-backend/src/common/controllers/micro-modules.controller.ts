import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException, BadRequestException, Optional, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MicroModuleRegistryService } from '../services/micro-module-registry.service';
import { MicroModuleManagerService } from '../../auth/micro-modules/manager/micro-module-manager.service';
import { MicroModuleSettingsService } from '../services/micro-module-settings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireRoles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { AuthMicroModule } from '../interfaces/micro-module.interface';

@ApiTags('micro-modules')
@Controller('micro-modules')
export class MicroModulesController {
  constructor(
    private microModuleRegistry: MicroModuleRegistryService,
    @Optional() private microModuleManager: MicroModuleManagerService,
    private microModuleSettingsService: MicroModuleSettingsService,
  ) {
    console.log('MicroModulesController: Constructor called');
    if (this.microModuleManager && (this.microModuleManager as any).instanceId) {
      console.log(`MicroModulesController: microModuleManager instanceId: ${(this.microModuleManager as any).instanceId}`);
    } else {
      console.log('MicroModulesController: microModuleManager not available, using registry fallback');
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получить список всех микромодулей' })
  @ApiResponse({ status: 200, description: 'Список микромодулей' })
  async getAllModules() {
    console.log('MicroModulesController: getAllModules called');
    console.log('MicroModulesController: microModuleRegistry:', !!this.microModuleRegistry);
    console.log('MicroModulesController: microModuleManager:', !!this.microModuleManager);
    
    try {
      // Используем MicroModuleManagerService, который содержит зарегистрированные модули
      let modules: any[] = [];
      if (this.microModuleManager) {
        modules = this.microModuleManager.getAllModules() as any[];
      } else {
        modules = this.microModuleRegistry.getAllModules() as any[];
      }
    console.log('Found modules:', modules.length);
      console.log('Module names:', modules.map((m: any) => m.name));
    
    // Получаем реальные статусы из базы данных
    const moduleSettings = await this.microModuleSettingsService.getAllModuleSettings();
    const settingsMap = new Map(moduleSettings.map(s => [s.moduleName, s.isEnabled]));
    
    // Возвращаем только нужные данные без циклических ссылок
      const result = modules.map((module: any) => ({
      name: module.name,
      version: module.version,
      displayName: module.displayName,
      description: module.description,
      isEnabled: settingsMap.get(module.name) ?? module.isEnabled,
      isSystem: module.isSystem,
      dependencies: module.dependencies,
      permissions: module.permissions,
      priority: module.priority,
        authMethods: ('authMethods' in module) ? (module as AuthMicroModule).authMethods || [] : [],
    }));
      
      console.log('Returning', result.length, 'modules');
      return result;
    } catch (error) {
      console.error('Error in getAllModules:', error);
      throw error;
    }
  }

  @Get('auth/status')
  @Public()
  @ApiOperation({ summary: 'Получить статус микромодулей аутентификации' })
  @ApiResponse({ status: 200, description: 'Статус микромодулей аутентификации' })
  async getAuthModulesStatus() {
    console.log('[MicroModulesController] getAuthModulesStatus called');
    console.log('[MicroModulesController] microModuleSettingsService:', !!this.microModuleSettingsService);
    
    // Используем getModuleStatus, чтобы гарантировать правильное чтение из базы
    console.log('[MicroModulesController] Calling getModuleStatus for email-auth...');
    const emailEnabled = await this.microModuleSettingsService.getModuleStatus('email-auth');
    console.log('[MicroModulesController] emailEnabled result:', emailEnabled);
    
    const githubEnabled = await this.microModuleSettingsService.getModuleStatus('github-auth');
    console.log('[MicroModulesController] githubEnabled result:', githubEnabled);
    
    const telegramEnabled = await this.microModuleSettingsService.getModuleStatus('telegram-auth');
    console.log('[MicroModulesController] telegramEnabled result:', telegramEnabled);
    
    console.log('[MicroModulesController] Status from getModuleStatus:', { emailEnabled, githubEnabled, telegramEnabled });
    
    const result = {
      email: { enabled: emailEnabled },
      github: { enabled: githubEnabled },
      telegram: { enabled: telegramEnabled },
    };
    
    console.log('[MicroModulesController] Auth modules status:', JSON.stringify(result));
    return result;
  }

  @Get('ui-elements')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить UI элементы для текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Список доступных UI элементов' })
  async getUIElements(@CurrentUser() user: any) {
    return this.microModuleRegistry.getUIElementsForUser(user);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @RequireRoles('super_admin')
  @ApiOperation({ summary: 'Получить статистику микромодулей (только super_admin)' })
  @ApiResponse({ status: 200, description: 'Статистика микромодулей' })
  async getModuleStats() {
    return this.microModuleRegistry.getModuleStats();
  }

  @Post(':moduleName/enable')
  @UseGuards(JwtAuthGuard)
  @RequireRoles('super_admin')
  @ApiOperation({ summary: 'Включить микромодуль (только super_admin)' })
  @ApiResponse({ status: 200, description: 'Микромодуль включен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async enableModule(@Param('moduleName') moduleName: string) {
    console.log(`MicroModulesController: enableModule called for ${moduleName}`);
    
    // Проверяем, что модуль существует - используем microModuleManager вместо registry
    const module = this.microModuleManager?.getModule(moduleName) || this.microModuleRegistry.getModule(moduleName);
    if (!module) {
      throw new NotFoundException(`Модуль ${moduleName} не найден`);
    }
    
    // Включаем модуль
    await this.microModuleSettingsService.toggleModule(moduleName, true);
    
    return { 
      success: true,
      message: `Модуль ${moduleName} включен`,
      moduleName,
      enabled: true,
    };
  }

  @Post(':moduleName/disable')
  @UseGuards(JwtAuthGuard)
  @RequireRoles('super_admin')
  @ApiOperation({ summary: 'Отключить микромодуль (только super_admin)' })
  @ApiResponse({ status: 200, description: 'Микромодуль отключен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async disableModule(@Param('moduleName') moduleName: string) {
    console.log(`MicroModulesController: disableModule called for ${moduleName}`);
    
    // Проверяем, что модуль существует - используем microModuleManager вместо registry
    const module = this.microModuleManager?.getModule(moduleName) || this.microModuleRegistry.getModule(moduleName);
    if (!module) {
      throw new NotFoundException(`Модуль ${moduleName} не найден`);
    }
    
    // Предупреждение для системных модулей, но разрешаем отключение суперадмином
    if (module.isSystem) {
      console.warn(`⚠️ Попытка отключить системный модуль ${moduleName}`);
      // Разрешаем отключение системных модулей суперадмином, но логируем предупреждение
    }
    
    // Отключаем модуль
    await this.microModuleSettingsService.toggleModule(moduleName, false);
    
    return { 
      success: true,
      message: `Модуль ${moduleName} отключен`,
      moduleName,
      enabled: false,
    };
  }

  @Get(':moduleName')
  @Public()
  @ApiOperation({ summary: 'Получить информацию о микромодуле' })
  @ApiResponse({ status: 200, description: 'Информация о микромодуле' })
  @ApiResponse({ status: 404, description: 'Микромодуль не найден' })
  async getModule(@Param('moduleName') moduleName: string) {
    const module = this.microModuleRegistry.getModule(moduleName);
    if (!module) {
      return { error: 'Микромодуль не найден' };
    }
    return module;
  }
}
