import { Controller, Post, Get, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NfaService } from '../services/nfa.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

@ApiTags('nfa')
@Controller('auth/nfa')
export class NfaController {
  constructor(private readonly nfaService: NfaService) {}

  @Post('send-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить коды для всех выбранных методов nFA' })
  @ApiResponse({ status: 200, description: 'Коды отправлены' })
  async sendCodes(@CurrentUser() user: any) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.nfaService.sendNfaCodes(userId);
  }

  @Post('send-codes/public')
  @Public()
  @ApiOperation({ summary: 'Отправить коды nFA по userId (публичный эндпоинт для логина)' })
  @ApiResponse({ status: 200, description: 'Коды отправлены' })
  async sendCodesPublic(@Body() body: { userId: string }) {
    const logger = new Logger(NfaController.name);
    logger.log(`📨 [sendCodesPublic] Получен запрос на отправку nFA кодов для userId: ${body?.userId}`);
    
    if (!body.userId) {
      logger.error(`❌ [sendCodesPublic] User ID отсутствует в теле запроса`);
      throw new Error('User ID is required');
    }
    
    logger.log(`✅ [sendCodesPublic] Вызываем sendNfaCodes для userId: ${body.userId}`);
    const result = await this.nfaService.sendNfaCodes(body.userId);
    logger.log(`✅ [sendCodesPublic] Результат отправки: ${JSON.stringify(result)}`);
    return result;
  }

  @Post('verify-method')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверить код для конкретного метода nFA' })
  @ApiResponse({ status: 200, description: 'Код проверен' })
  async verifyMethod(
    @CurrentUser() user: any,
    @Body() body: { method: string; code: string },
  ) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.nfaService.verifyMethodCode(userId, body.method, body.code);
  }

  @Post('verify-method/public')
  @Public()
  @ApiOperation({ summary: 'Проверить код nFA по userId (публичный эндпоинт для логина)' })
  @ApiResponse({ status: 200, description: 'Код проверен' })
  async verifyMethodPublic(@Body() body: { userId: string; method: string; code: string }) {
    if (!body.userId || !body.method || !body.code) {
      throw new Error('userId, method and code are required');
    }
    return this.nfaService.verifyMethodCode(body.userId, body.method, body.code);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить статус верификации всех методов nFA' })
  @ApiResponse({ status: 200, description: 'Статус получен' })
  async getStatus(@CurrentUser() user: any) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.nfaService.getVerificationStatus(userId);
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Настроить nFA - выбрать методы защиты' })
  @ApiResponse({ status: 200, description: 'nFA настроена' })
  async configure(
    @CurrentUser() user: any,
    @Body() body: { methods: string[]; requiredMethods?: number },
  ) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.nfaService.configureNfa(userId, body.methods, body.requiredMethods);
  }

  @Get('is-complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверить, завершена ли nFA верификация' })
  @ApiResponse({ status: 200, description: 'Статус проверки' })
  async isComplete(@CurrentUser() user: any) {
    const userId = user.id || user.userId;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    const isComplete = await this.nfaService.isNfaComplete(userId);
    return {
      complete: isComplete,
      message: isComplete ? 'Все методы подтверждены' : 'Ожидается подтверждение методов',
    };
  }
}

