import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubTwoFactorService } from './github-2fa.service';
import { GitHubTwoFactorController } from './github-2fa.controller';
import { TwoFactorCode } from '../../../entities/two-factor-code.entity';
import { User } from '../../../../users/entities/user.entity';
import { EmailService } from '../../../email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TwoFactorCode, User]),
  ],
  controllers: [GitHubTwoFactorController],
  providers: [GitHubTwoFactorService, EmailService],
  exports: [GitHubTwoFactorService],
})
export class GitHubTwoFactorModule {}

