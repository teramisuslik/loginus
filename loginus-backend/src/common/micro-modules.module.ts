import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MicroModuleRegistryService } from './services/micro-module-registry.service';
import { MicroModuleInitializerService } from './services/micro-module-initializer.service';
import { PermissionsUtilsService } from './services/permissions-utils.service';
import { MicroModuleSettingsService } from './services/micro-module-settings.service';
import { MicroModuleSettings } from './entities/micro-module-settings.entity';

// Импортируем модули микромодулей
import { EmailAuthModule } from '../auth/micro-modules/email-auth/email-auth.module';
import { GitHubAuthMicroModuleModule } from '../auth/micro-modules/github-auth/github-auth.module';
import { TelegramAuthMicroModuleModule } from '../auth/micro-modules/telegram-auth/telegram-auth.module';
import { ReferralModule } from '../auth/micro-modules/referral-system/referral.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([MicroModuleSettings]),
    forwardRef(() => EmailAuthModule),
    forwardRef(() => GitHubAuthMicroModuleModule),
    forwardRef(() => TelegramAuthMicroModuleModule),
    forwardRef(() => ReferralModule),
  ],
  providers: [
    MicroModuleRegistryService, 
    MicroModuleInitializerService,
    PermissionsUtilsService,
    MicroModuleSettingsService
  ],
  exports: [MicroModuleRegistryService, MicroModuleInitializerService, PermissionsUtilsService, MicroModuleSettingsService],
})
export class MicroModulesModule {}
