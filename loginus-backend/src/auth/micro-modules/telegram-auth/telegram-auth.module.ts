import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramAuthMicroModule } from './telegram-auth.micro-module';
import { TelegramAuthMicroModuleService } from './telegram-auth.service';
import { TelegramAuthMicroModuleController } from './telegram-auth.controller';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';
import { MicroModuleSettings } from '../../../common/entities/micro-module-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MicroModuleSettings])],
  controllers: [TelegramAuthMicroModuleController],
  providers: [TelegramAuthMicroModule, TelegramAuthMicroModuleService, MicroModuleSettingsService],
  exports: [TelegramAuthMicroModule, TelegramAuthMicroModuleService],
})
export class TelegramAuthMicroModuleModule {}