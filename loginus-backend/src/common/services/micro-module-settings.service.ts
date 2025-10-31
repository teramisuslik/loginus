import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MicroModuleSettings } from '../entities/micro-module-settings.entity';

@Injectable()
export class MicroModuleSettingsService {
  constructor(
    @InjectRepository(MicroModuleSettings)
    private readonly microModuleSettingsRepository: Repository<MicroModuleSettings>,
  ) {}

  /**
   * Получение статуса микромодуля
   */
  async getModuleStatus(moduleName: string): Promise<boolean> {
    try {
      const settings = await this.microModuleSettingsRepository.findOne({
        where: { moduleName },
      });
      
      console.log(`[getModuleStatus] Module: ${moduleName}, Found: ${!!settings}, isEnabled: ${settings?.isEnabled}`);
      
      // Если записи нет, для email-auth возвращаем true (по умолчанию включен), для остальных false
      if (!settings) {
        const defaultValue = moduleName === 'email-auth' ? true : false;
        console.log(`[getModuleStatus] No settings found for ${moduleName}, returning default: ${defaultValue}`);
        return defaultValue;
      }
      
      // Если запись есть, возвращаем значение из базы
      // Проверяем явно: только true или 1 считаются enabled, все остальное - disabled
      const rawValue: any = settings.isEnabled;
      // Явная проверка: только true или 1 считаются enabled
      const result = rawValue === true || (typeof rawValue === 'number' && rawValue === 1) || rawValue === 'true' || rawValue === '1';
      console.log(`[getModuleStatus] Module: ${moduleName}, Found: YES, rawValue: ${JSON.stringify(rawValue)}, type: ${typeof rawValue}, === true: ${rawValue === true}, === false: ${rawValue === false}, result: ${result}`);
      return result;
    } catch (error) {
      console.error(`[getModuleStatus] Error for ${moduleName}:`, error);
      // При ошибке возвращаем дефолтное значение
      return moduleName === 'email-auth' ? true : false;
    }
  }

  /**
   * Получение всех настроек микромодулей
   */
  async getAllModuleSettings(): Promise<MicroModuleSettings[]> {
    return this.microModuleSettingsRepository.find();
  }

  /**
   * Включение/выключение микромодуля
   */
  async toggleModule(moduleName: string, enabled: boolean): Promise<void> {
    const settings = await this.microModuleSettingsRepository.findOne({
      where: { moduleName },
    });

    if (settings) {
      settings.isEnabled = enabled;
      await this.microModuleSettingsRepository.save(settings);
    } else {
      // Создаем новые настройки, если их нет
      const newSettings = this.microModuleSettingsRepository.create({
        moduleName,
        isEnabled: enabled,
        config: {},
      });
      await this.microModuleSettingsRepository.save(newSettings);
    }
  }

  /**
   * Получение конфигурации микромодуля
   */
  async getModuleConfig(moduleName: string): Promise<Record<string, any>> {
    const settings = await this.microModuleSettingsRepository.findOne({
      where: { moduleName },
    });
    return settings?.config ?? {};
  }

  /**
   * Обновление конфигурации микромодуля
   */
  async updateModuleConfig(moduleName: string, config: Record<string, any>): Promise<void> {
    const settings = await this.microModuleSettingsRepository.findOne({
      where: { moduleName },
    });

    if (settings) {
      settings.config = { ...settings.config, ...config };
      await this.microModuleSettingsRepository.save(settings);
    } else {
      const newSettings = this.microModuleSettingsRepository.create({
        moduleName,
        isEnabled: true,
        config,
      });
      await this.microModuleSettingsRepository.save(newSettings);
    }
  }
}
