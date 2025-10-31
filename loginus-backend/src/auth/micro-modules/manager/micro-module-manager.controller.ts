import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { MicroModuleManagerService } from './micro-module-manager.service';

@ApiTags('Micro Module Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('micro-modules')
export class MicroModuleManagerController {
  constructor(
    private readonly microModuleManagerService: MicroModuleManagerService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику микромодулей' })
  @ApiResponse({ status: 200, description: 'Статистика получена' })
  getStats() {
    return this.microModuleManagerService.getModulesStats();
  }

  @Get('list')
  @ApiOperation({ summary: 'Получить список всех микромодулей' })
  @ApiResponse({ status: 200, description: 'Список микромодулей получен' })
  getAllModules() {
    const modules = this.microModuleManagerService.getAllModules();
    return {
      modules: modules.map(module => ({
        name: module.name,
        version: module.version,
        displayName: module.displayName,
        description: module.description,
        isEnabled: module.isEnabled,
        isSystem: module.isSystem,
        priority: module.priority,
        authMethods: ('authMethods' in module) ? module.authMethods || [] : [],
      }))
    };
  }


  @Get('active')
  @ApiOperation({ summary: 'Получить активные микромодули' })
  @ApiResponse({ status: 200, description: 'Активные микромодули получены' })
  getActiveModules() {
    const modules = this.microModuleManagerService.getActiveModules();
    return {
      modules: modules.map(module => ({
        name: module.name,
        version: module.version,
        displayName: module.displayName,
        description: module.description,
        isEnabled: module.isEnabled,
        isSystem: module.isSystem,
        priority: module.priority,
        authMethods: ('authMethods' in module) ? module.authMethods || [] : [],
      }))
    };
  }

  @Public()
  @Get('auth/status')
  @ApiOperation({ summary: 'Получить статус микромодулей авторизации' })
  @ApiResponse({ status: 200, description: 'Статус микромодулей авторизации получен' })
  async getAuthModulesStatus() {
    console.log('[MicroModuleManagerController] getAuthModulesStatus called');
    const result = await this.microModuleManagerService.getAuthModulesStatus();
    console.log('[MicroModuleManagerController] Returning:', JSON.stringify(result));
    return result;
  }

  @Get(':moduleName')
  @ApiOperation({ summary: 'Получить информацию о конкретном микромодуле' })
  @ApiResponse({ status: 200, description: 'Информация о микромодуле получена' })
  @ApiResponse({ status: 404, description: 'Микромодуль не найден' })
  getModule(@Param('moduleName') moduleName: string) {
    const module = this.microModuleManagerService.getModule(moduleName);
    if (!module) {
      return { error: 'Микромодуль не найден' };
    }
    
    return {
      name: module.name,
      version: module.version,
      displayName: module.displayName,
      description: module.description,
      isEnabled: module.isEnabled,
      isSystem: module.isSystem,
      priority: module.priority,
      authMethods: ('authMethods' in module) ? module.authMethods || [] : [],
      permissions: module.permissions || [],
      uiElements: module.uiElements || [],
    };
  }

  @Delete(':moduleName')
  @ApiOperation({ summary: 'Отключить микромодуль' })
  @ApiResponse({ status: 200, description: 'Микромодуль отключен' })
  @ApiResponse({ status: 404, description: 'Микромодуль не найден' })
  unregisterModule(@Param('moduleName') moduleName: string) {
    const success = this.microModuleManagerService.unregisterModule(moduleName);
    return {
      success,
      message: success ? 'Микромодуль отключен' : 'Микромодуль не найден'
    };
  }
}
