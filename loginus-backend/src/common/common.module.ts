import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MicroModulesController } from './controllers/micro-modules.controller';
import { TestController } from './controllers/test.controller';
import { MicroModulesModule } from './micro-modules.module';
import { MicroModuleRegistryService } from './services/micro-module-registry.service';
import { MicroModuleSettingsService } from './services/micro-module-settings.service';
import { MicroModuleSettings } from './entities/micro-module-settings.entity';
// FinalMicroModulesModule - глобальный модуль, импортируется в AppModule

@Module({
  imports: [
    MicroModulesModule,
    TypeOrmModule.forFeature([MicroModuleSettings]),
    // FinalMicroModulesModule - глобальный модуль, доступен автоматически после импорта в AppModule
  ],
  controllers: [MicroModulesController, TestController],
  providers: [
    MicroModuleRegistryService,
    MicroModuleSettingsService,
  ],
  exports: [MicroModuleSettingsService],
})
export class CommonModule {}
