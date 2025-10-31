import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubAuthMicroModule } from './github-auth.micro-module';
import { GitHubAuthMicroModuleService } from './github-auth.service';
import { GitHubAuthMicroModuleController } from './github-auth.controller';
import { MicroModuleSettingsService } from '../../../common/services/micro-module-settings.service';
import { MicroModuleSettings } from '../../../common/entities/micro-module-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MicroModuleSettings])],
  controllers: [GitHubAuthMicroModuleController],
  providers: [GitHubAuthMicroModule, GitHubAuthMicroModuleService, MicroModuleSettingsService],
  exports: [GitHubAuthMicroModule, GitHubAuthMicroModuleService],
})
export class GitHubAuthMicroModuleModule {}