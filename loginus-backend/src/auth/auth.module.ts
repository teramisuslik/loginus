import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetController } from './password-reset.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { TwoFactorCode } from './entities/two-factor-code.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { Role } from '../rbac/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UserRoleAssignment } from '../users/entities/user-role-assignment.entity';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { SettingsModule } from '../settings/settings.module';

// ✅ НОВЫЕ СЕРВИСЫ И КОНТРОЛЛЕРЫ ДЛЯ MULTI-AUTH
import { MultiAuthService } from './services/multi-auth.service';
import { PhoneAuthService } from './services/phone-auth.service';
import { GitHubAuthService } from './services/github-auth.service';
import { VKontakteAuthService } from './services/vkontakte-auth.service';
import { GosuslugiAuthService } from './services/gosuslugi-auth.service';
import { MultiAuthController } from './controllers/multi-auth.controller';
import { OAuthController } from './controllers/oauth.controller';
import { VerificationCode } from './entities/verification-code.entity';
import { AccountMergeRequest } from './entities/account-merge-request.entity';
import { OAuthClient } from './entities/oauth-client.entity';
import { AuthorizationCode } from './entities/authorization-code.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { TeamMembership } from '../teams/entities/team-membership.entity';
import { Permission } from '../rbac/entities/permission.entity';

// Micro Modules
import { FinalMicroModulesModule } from './micro-modules/final-micro-modules.module';
import { ReferralModule } from './micro-modules/referral-system/referral.module';
import { InvitationsModule } from './micro-modules/invitations/invitations.module';
import { EmailCodeModule } from './micro-modules/email-code/email-code.module';

// nFA Service and Controller
import { NfaService } from './services/nfa.service';
import { NfaController } from './controllers/nfa.controller';
import { OAuthService } from './services/oauth.service';
import { GitHubTwoFactorService } from './micro-modules/two-factor/github/github-2fa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshToken, 
      TwoFactorCode, 
      PasswordResetToken, 
      EmailVerificationToken, 
      Role, 
      User, 
      UserRoleAssignment,
      // ✅ НОВЫЕ ENTITIES ДЛЯ MULTI-AUTH
      VerificationCode,
      AccountMergeRequest,
      // ✅ OAuth ENTITIES
      OAuthClient,
      AuthorizationCode,
      // ✅ Entities для расширенного OAuth userinfo
      OrganizationMembership,
      TeamMembership,
      Permission,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'default-secret',
        signOptions: {
          expiresIn: '15m' as any,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    RbacModule,
    SettingsModule,
    ReferralModule, // Реферальная система
    InvitationsModule, // Система приглашений
    EmailCodeModule, // Вход по коду с почты
    FinalMicroModulesModule, // Подключаем все микромодули (теперь глобальный модуль, forRoot не нужен)
  ],
  controllers: [
    AuthController, 
    TwoFactorController, 
    PasswordResetController,
    // ✅ НОВЫЕ КОНТРОЛЛЕРЫ ДЛЯ MULTI-AUTH
    MultiAuthController,
    NfaController, // nFA контроллер
    OAuthController, // OAuth контроллер
  ],
  providers: [
    AuthService, 
    TwoFactorService, 
    EmailService, 
    SmsService, 
    PasswordResetService, 
    JwtStrategy,
    // ✅ НОВЫЕ СЕРВИСЫ ДЛЯ MULTI-AUTH
    MultiAuthService,
    PhoneAuthService,
    GitHubAuthService,
    VKontakteAuthService,
    GosuslugiAuthService,
    NfaService, // nFA сервис
    GitHubTwoFactorService, // GitHub 2FA сервис для nFA
    OAuthService, // OAuth сервис
  ],
  exports: [
    AuthService, 
    TwoFactorService,
    // ✅ ЭКСПОРТИРУЕМ НОВЫЕ СЕРВИСЫ
    MultiAuthService,
    PhoneAuthService,
    GitHubAuthService,
    VKontakteAuthService,
    GosuslugiAuthService,
  ],
})
export class AuthModule {}
