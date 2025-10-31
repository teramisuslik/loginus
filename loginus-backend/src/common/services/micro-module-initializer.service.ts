import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MicroModuleRegistryService } from './micro-module-registry.service';
import { EmailAuthMicroModule } from '../../auth/micro-modules/email-auth/email-auth.micro-module';
import { GitHubAuthMicroModule } from '../../auth/micro-modules/github-auth/github-auth.micro-module';
import { TelegramAuthMicroModule } from '../../auth/micro-modules/telegram-auth/telegram-auth.micro-module';
import { ReferralMicroModule } from '../../auth/micro-modules/referral-system/referral.micro-module';

@Injectable()
export class MicroModuleInitializerService implements OnModuleInit {
  private readonly logger = new Logger(MicroModuleInitializerService.name);

  constructor(
    private readonly microModuleRegistry: MicroModuleRegistryService,
    private readonly emailAuthMicroModule: EmailAuthMicroModule,
    private readonly githubAuthMicroModule: GitHubAuthMicroModule,
    private readonly telegramAuthMicroModule: TelegramAuthMicroModule,
    private readonly referralMicroModule: ReferralMicroModule,
  ) {}

  async onModuleInit() {
    this.logger.log('Инициализация микромодулей...');
    
    try {
      // Регистрируем все микромодули
      await this.microModuleRegistry.registerModule(this.emailAuthMicroModule);
      await this.microModuleRegistry.registerModule(this.githubAuthMicroModule);
      await this.microModuleRegistry.registerModule(this.telegramAuthMicroModule);
      await this.microModuleRegistry.registerModule(this.referralMicroModule);
      
      this.logger.log('Все микромодули инициализированы.');
    } catch (error) {
      this.logger.error('Ошибка инициализации микромодулей:', error);
    }
  }
}