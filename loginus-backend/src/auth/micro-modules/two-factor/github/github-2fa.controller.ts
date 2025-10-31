import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GitHubTwoFactorService } from './github-2fa.service';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CurrentUser } from '../../../decorators/current-user.decorator';

@ApiTags('2fa')
@Controller('auth/2fa/github')
export class GitHubTwoFactorController {
  constructor(private readonly githubTwoFactorService: GitHubTwoFactorService) {}

  @Post('send-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить 2FA код на email из GitHub профиля' })
  @ApiResponse({ status: 200, description: 'Код отправлен' })
  @ApiResponse({ status: 400, description: 'Ошибка отправки' })
  async sendCode(@CurrentUser() user: any) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.githubTwoFactorService.sendGitHubCode(userId);
  }

  @Post('verify-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверить 2FA код из GitHub' })
  @ApiResponse({ status: 200, description: 'Код подтвержден' })
  @ApiResponse({ status: 400, description: 'Неверный код' })
  async verifyCode(@CurrentUser() user: any, @Body('code') code: string) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    if (!code) {
      throw new Error('Код обязателен');
    }
    return this.githubTwoFactorService.verifyGitHubCode(userId, code);
  }
}

