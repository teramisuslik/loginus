import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Public } from '../../decorators/public.decorator';

@ApiTags('referral')
@Controller('auth/referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Генерация реферального кода
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Генерация реферального кода' })
  @ApiResponse({ status: 201, description: 'Реферальный код создан' })
  async generateReferralCode(
    @CurrentUser() user: any,
    @Body() body: { expiresInDays?: number; usageLimit?: number | null }
  ) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    const result = await this.referralService.generateReferralLink(
      userId,
      body.expiresInDays || 30,
      body.usageLimit !== undefined ? body.usageLimit : null
    );

    return {
      success: true,
      referral: {
        id: result.referral.id,
        code: result.code,
        link: result.link,
        expiresAt: result.referral.expiresAt,
        createdAt: result.referral.createdAt,
      },
    };
  }

  /**
   * Получение реферальных кодов пользователя
   */
  @Get('my-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение реферальных кодов пользователя' })
  @ApiResponse({ status: 200, description: 'Список реферальных кодов' })
  async getMyReferralCodes(@CurrentUser() user: any) {
    const userId = user.id || user.userId;
    const codes = await this.referralService.getUserReferralCodes(userId);
    
    return {
      success: true,
      codes: codes.map(code => {
        const frontendUrl = this.configService?.get<string>('FRONTEND_URL') || 
                           this.configService?.get<string>('APP_FRONTEND_URL') ||
                           'https://loginus.startapus.com';
        const link = `${frontendUrl}/index.html?ref=${code.code}`;
        
        return {
          id: code.id,
          code: code.code,
          link: link,
          isUsed: code.isUsed,
          usedAt: code.usedAt,
          expiresAt: code.expiresAt,
          createdAt: code.createdAt,
          usageLimit: code.usageLimit,
          usageCount: code.usageCount || 0,
        };
      }),
    };
  }

  /**
   * Получение статистики рефералов
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение статистики рефералов' })
  @ApiResponse({ status: 200, description: 'Статистика рефералов' })
  async getReferralStats(@CurrentUser() user: any) {
    const userId = user.id || user.userId;
    const stats = await this.referralService.getUserReferralStats(userId);
    const referrals = await this.referralService.getUserReferrals(userId);

    return {
      success: true,
      stats,
      referrals: referrals
        .filter(ref => ref.usageCount > 0) // Только использованные коды
        .map(ref => ({
        id: ref.id,
        code: ref.code,
          usageCount: ref.usageCount || 0,
          usageHistory: ref.metadata?.usageHistory || [],
        referredUser: ref.referred ? {
          id: ref.referred.id,
          firstName: ref.referred.firstName,
          lastName: ref.referred.lastName,
          email: ref.referred.email,
        } : null,
          lastUsedAt: ref.metadata?.lastUsedAt || null,
      })),
    };
  }

  /**
   * Проверка валидности реферального кода (публичный endpoint)
   */
  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Проверка валидности реферального кода' })
  @ApiResponse({ status: 200, description: 'Результат проверки кода' })
  async validateReferralCode(@Body() body: { code: string }) {
    const result = await this.referralService.validateReferralCode(body.code);

    return {
      success: true,
      valid: result.valid,
      message: result.message,
      referrer: result.referrer ? {
        firstName: result.referrer.firstName,
        lastName: result.referrer.lastName,
      } : null,
    };
  }

  /**
   * Использование реферального кода при регистрации
   */
  @Post('use')
  @Public()
  @ApiOperation({ summary: 'Использование реферального кода при регистрации' })
  @ApiResponse({ status: 200, description: 'Реферальный код использован' })
  async useReferralCode(
    @Body() body: { code: string; userId: string },
    @Req() req: any
  ) {
    const referral = await this.referralService.useReferralCode(
      body.code,
      body.userId,
      req.ip,
      req.get('User-Agent')
    );

    return {
      success: true,
      message: 'Реферальный код успешно использован',
      referral: {
        id: referral.id,
        code: referral.code,
        referrerId: referral.referrerId,
        usedAt: referral.usedAt,
      },
    };
  }
}