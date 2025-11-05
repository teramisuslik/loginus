import { Module, DynamicModule, OnModuleInit, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MicroModuleManagerService } from './manager/micro-module-manager.service';
import { MicroModuleManagerController } from './manager/micro-module-manager.controller';

// Simple Services
import { SimpleEmail2FAService } from './two-factor/email/simple-email-2fa.service';
import { SimpleSms2FAService } from './two-factor/sms/simple-sms-2fa.service';
import { SimpleTelegram2FAService } from './two-factor/telegram/simple-telegram-2fa.service';
import { SimpleRolePromotionService } from './role-promotion/simple-role-promotion.service';

// 2FA Controllers
import { EmailTwoFactorController } from './two-factor/email/email-2fa.controller';
import { SmsTwoFactorController } from './two-factor/sms/sms-2fa.controller';
import { TelegramTwoFactorController } from './two-factor/telegram/telegram-2fa.controller';
import { GitHubTwoFactorController } from './two-factor/github/github-2fa.controller';

// 2FA Services
import { EmailTwoFactorService } from './two-factor/email/email-2fa.service';
import { SmsTwoFactorService } from './two-factor/sms/sms-2fa.service';
import { TelegramTwoFactorService } from './two-factor/telegram/telegram-2fa.service';
import { GitHubTwoFactorService } from './two-factor/github/github-2fa.service';

// External Services
import { EmailService } from '../email.service';
import { SmsService } from '../sms.service';

// Invitations Module
import { InvitationsModule } from './invitations/invitations.module';

// Auth Micro Modules
import { GitHubAuthMicroModuleModule } from './github-auth/github-auth.module';
import { TelegramAuthMicroModuleModule } from './telegram-auth/telegram-auth.module';
import { EmailAuthModule } from './email-auth/email-auth.module';
import { ReferralModule } from './referral-system/referral.module';

// Auth Micro Module Services
import { GitHubAuthMicroModuleService } from './github-auth/github-auth.service';
import { TelegramAuthMicroModuleService } from './telegram-auth/telegram-auth.service';

// Auth Micro Modules
import { GitHubAuthMicroModule } from './github-auth/github-auth.micro-module';
import { TelegramAuthMicroModule } from './telegram-auth/telegram-auth.micro-module';
import { EmailAuthMicroModule } from './email-auth/email-auth.micro-module';
import { ReferralMicroModule } from './referral-system/referral.micro-module';

// Entities
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { TwoFactorCode } from '../entities/two-factor-code.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

// Common Services
import { MicroModuleSettingsService } from '../../common/services/micro-module-settings.service';
import { MicroModuleSettings } from '../../common/entities/micro-module-settings.entity';

@Global() // Делаем модуль глобальным, чтобы MicroModuleManagerService был доступен везде
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, TwoFactorCode, RefreshToken, MicroModuleSettings]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '15m' },
    }),
    InvitationsModule,
    GitHubAuthMicroModuleModule,
    TelegramAuthMicroModuleModule,
    EmailAuthModule,
    ReferralModule,
  ],
  providers: [
    MicroModuleManagerService,
    MicroModuleSettingsService,
    SimpleEmail2FAService,
    SimpleSms2FAService,
    SimpleTelegram2FAService,
    SimpleRolePromotionService,
    EmailService,
    SmsService,
    EmailTwoFactorService,
    SmsTwoFactorService,
    TelegramTwoFactorService,
    GitHubTwoFactorService,
    GitHubAuthMicroModuleService,
    TelegramAuthMicroModuleService,
    // Добавляем микромодули в providers, чтобы их можно было инжектить
    EmailAuthMicroModule,
    ReferralMicroModule,
  ],
  controllers: [
    MicroModuleManagerController,
    EmailTwoFactorController,
    SmsTwoFactorController,
    TelegramTwoFactorController,
    GitHubTwoFactorController,
  ],
  exports: [
    MicroModuleManagerService,
    SimpleEmail2FAService,
    SimpleSms2FAService,
    SimpleTelegram2FAService,
    SimpleRolePromotionService,
    EmailTwoFactorService,
    SmsTwoFactorService,
    TelegramTwoFactorService,
    GitHubTwoFactorService,
  ],
})
export class FinalMicroModulesModule implements OnModuleInit {
  constructor(
    private readonly microModuleManagerService: MicroModuleManagerService,
    private readonly githubAuthMicroModule: GitHubAuthMicroModule,
    private readonly telegramAuthMicroModule: TelegramAuthMicroModule,
    private readonly emailAuthMicroModule: EmailAuthMicroModule,
    private readonly referralMicroModule: ReferralMicroModule,
  ) {}

  onModuleInit() {
    console.log('🔧 [FinalMicroModulesModule] Registering all modules...');
    this.microModuleManagerService.registerModule(this.emailAuthMicroModule);
    this.microModuleManagerService.registerModule(this.githubAuthMicroModule);
    this.microModuleManagerService.registerModule(this.telegramAuthMicroModule);
    // ReferralMicroModule не является AuthMicroModule, но является MicroModule
    // Используем type assertion для обхода проверки типов
    this.microModuleManagerService.registerModule(this.referralMicroModule as any);
    console.log('✅ [FinalMicroModulesModule] All 4 modules registered');
  }

  static forRoot(): DynamicModule {
    return {
      module: FinalMicroModulesModule,
      imports: [
        TypeOrmModule.forFeature([User, Role, TwoFactorCode, RefreshToken, MicroModuleSettings]),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'default-secret',
          signOptions: { expiresIn: '15m' },
        }),
        InvitationsModule,
        GitHubAuthMicroModuleModule,
        TelegramAuthMicroModuleModule,
        EmailAuthModule,
        ReferralModule,
      ],
      providers: [
        MicroModuleManagerService,
        MicroModuleSettingsService,
        SimpleEmail2FAService,
        SimpleSms2FAService,
        SimpleTelegram2FAService,
        SimpleRolePromotionService,
        EmailService,
        SmsService,
        EmailTwoFactorService,
        SmsTwoFactorService,
        TelegramTwoFactorService,
        GitHubTwoFactorService,
        GitHubAuthMicroModuleService,
        TelegramAuthMicroModuleService,
      ],
      controllers: [
        MicroModuleManagerController,
        EmailTwoFactorController,
        SmsTwoFactorController,
        TelegramTwoFactorController,
        GitHubTwoFactorController,
      ],
      exports: [
        MicroModuleManagerService, // Экспортируем для использования в CommonModule
        SimpleEmail2FAService,
        SimpleSms2FAService,
        SimpleTelegram2FAService,
        SimpleRolePromotionService,
        EmailTwoFactorService,
        SmsTwoFactorService,
        TelegramTwoFactorService,
        GitHubTwoFactorService,
      ],
    };
  }
}
