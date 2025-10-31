import { Controller, Post, Get, Body, Query, Param, UseGuards, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { MultiAuthService } from '../services/multi-auth.service';
import { PhoneAuthService } from '../services/phone-auth.service';
import { GitHubAuthService } from '../services/github-auth.service';
import { VKontakteAuthService } from '../services/vkontakte-auth.service';
import { GosuslugiAuthService } from '../services/gosuslugi-auth.service';
import { AuthService } from '../auth.service';
import { NfaService } from '../services/nfa.service';
import { AuthMethodType } from '../enums/auth-method-type.enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

@ApiTags('multi-auth')
@Controller('auth/multi')
export class MultiAuthController {
  private readonly logger = new Logger(MultiAuthController.name);

  constructor(
    private multiAuthService: MultiAuthService,
    private phoneAuthService: PhoneAuthService,
    private githubAuthService: GitHubAuthService,
    private vkontakteAuthService: VKontakteAuthService,
    private gosuslugiAuthService: GosuslugiAuthService,
    private authService: AuthService,
    private nfaService: NfaService,
  ) {}

  /**
   * Универсальная регистрация через любой метод аутентификации
   */
  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Регистрация через любой метод аутентификации' })
  @ApiResponse({ status: 201, description: 'Пользователь зарегистрирован' })
  @ApiResponse({ status: 409, description: 'Требуется слияние аккаунтов' })
  async register(
    @Body() body: {
      authMethod: AuthMethodType;
      identifier: string;
      password?: string;
      messenger?: 'whatsapp' | 'telegram';
      additionalData?: any;
    },
  ) {
    const { authMethod, identifier, password, messenger, additionalData } = body;

    // Если это телефонная аутентификация, отправляем код
    if (authMethod === AuthMethodType.PHONE_WHATSAPP || authMethod === AuthMethodType.PHONE_TELEGRAM) {
      if (!messenger) {
        return {
          success: false,
          error: 'Необходимо указать мессенджер для телефонной аутентификации',
        };
      }

      // Генерируем код верификации
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Отправляем код через выбранный мессенджер
      const sendResult = await this.phoneAuthService.sendCode(identifier, code, messenger, 'registration');
      
      if (!sendResult.success) {
        return sendResult;
      }

      // Сохраняем код в базе данных для последующей верификации
      // Здесь должен быть вызов MultiAuthService.generateVerificationCode
      
      return {
        success: true,
        requiresVerification: true,
        message: `Код отправлен через ${messenger}`,
      };
    }

    // Для других методов аутентификации
    return this.multiAuthService.register(authMethod, identifier, password, additionalData);
  }

  /**
   * Универсальный вход через любой метод аутентификации
   */
  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Вход через любой метод аутентификации' })
  @ApiResponse({ status: 200, description: 'Успешная авторизация' })
  @ApiResponse({ status: 401, description: 'Неверные credentials' })
  async login(
    @Body() body: {
      authMethod: AuthMethodType;
      identifier: string;
      password?: string;
      verificationCode?: string;
    },
  ) {
    const { authMethod, identifier, password, verificationCode } = body;
    return this.multiAuthService.login(authMethod, identifier, password, verificationCode);
  }

  /**
   * Привязка дополнительного метода аутентификации
   */
  @Post('bind')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Привязка дополнительного метода аутентификации' })
  @ApiResponse({ status: 200, description: 'Метод аутентификации привязан' })
  @ApiResponse({ status: 400, description: 'Ошибка привязки' })
  async bindAuthMethod(
    @Req() req: Request,
    @Body() body: {
      authMethod: AuthMethodType;
      identifier: string;
      password?: string;
      verificationCode?: string;
    },
  ) {
    const userId = (req as any).user.userId;
    const { authMethod, identifier, password, verificationCode } = body;
    
    // If this is EMAIL binding and password is provided, we need to hash and set it
    if (authMethod === AuthMethodType.EMAIL && password) {
      // Check if email is already in use by another user
      const existingUser = await this.multiAuthService['usersRepo'].findOne({ 
        where: { email: identifier } 
      });
      
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'Этот email уже используется другим аккаунтом. Для привязки email к существующему аккаунту необходимо знать пароль от этого аккаунта.'
        };
      }
      
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Update user's email and passwordHash
      const user = await this.multiAuthService['usersRepo'].findOne({ where: { id: userId } });
      if (user) {
        user.email = identifier;
        user.passwordHash = passwordHash;
        user.emailVerified = true;
        
        // Add EMAIL to available methods if not already there
        if (!user.availableAuthMethods.includes(AuthMethodType.EMAIL)) {
          user.availableAuthMethods.push(AuthMethodType.EMAIL);
        }
        
        await this.multiAuthService['usersRepo'].save(user);
        
        return { success: true, user };
      }
    }
    
    return this.multiAuthService.bindAuthMethod(userId, authMethod, identifier, verificationCode);
  }

  /**
   * Отвязка метода аутентификации
   */
  @Post('unbind')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отвязка метода аутентификации' })
  @ApiResponse({ status: 200, description: 'Метод аутентификации отвязан' })
  @ApiResponse({ status: 400, description: 'Ошибка отвязки' })
  async unbindAuthMethod(
    @Req() req: Request,
    @Body() body: {
      authMethod: AuthMethodType;
      verificationCode?: string;
    },
  ) {
    const userId = (req as any).user.userId;
    const { authMethod, verificationCode } = body;
    
    return this.multiAuthService.unbindAuthMethod(userId, authMethod, verificationCode);
  }

  /**
   * Слияние аккаунтов
   */
  @Post('merge')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Слияние аккаунтов с разрешением конфликтов' })
  @ApiResponse({ status: 200, description: 'Аккаунты успешно слиты' })
  @ApiResponse({ status: 400, description: 'Ошибка слияния' })
  async mergeAccounts(
    @Body() body: {
      mergeRequestId: string;
      resolution: any; // MergeResolution
    },
  ) {
    const { mergeRequestId, resolution } = body;
    return this.multiAuthService.mergeAccounts(mergeRequestId, resolution);
  }

  /**
   * Настройка многофакторной аутентификации
   */
  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Настройка многофакторной аутентификации' })
  @ApiResponse({ status: 200, description: 'MFA настроена' })
  async setupMfa(
    @Req() req: Request,
    @Body() body: {
      methods: AuthMethodType[];
      requiredMethods?: number;
    },
  ) {
    const userId = (req as any).user.userId;
    const { methods, requiredMethods = 1 } = body;
    
    return this.multiAuthService.setupMfa(userId, methods, requiredMethods);
  }

  /**
   * Отключение многофакторной аутентификации
   */
  @Post('mfa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отключение многофакторной аутентификации' })
  @ApiResponse({ status: 200, description: 'MFA отключена' })
  async disableMfa(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.multiAuthService.disableMfa(userId);
  }

  /**
   * Получение доступных методов аутентификации
   */
  @Get('methods')
  @Public()
  @ApiOperation({ summary: 'Получение доступных методов аутентификации' })
  @ApiResponse({ status: 200, description: 'Список доступных методов' })
  async getAvailableMethods() {
    return {
      methods: Object.values(AuthMethodType),
      descriptions: {
        [AuthMethodType.EMAIL]: 'Электронная почта',
        [AuthMethodType.PHONE_WHATSAPP]: 'Телефон через WhatsApp',
        [AuthMethodType.PHONE_TELEGRAM]: 'Телефон через Telegram',
        [AuthMethodType.GOSUSLUGI]: 'Госуслуги',
        [AuthMethodType.VKONTAKTE]: 'ВКонтакте',
        [AuthMethodType.GITHUB]: 'GitHub',
      },
    };
  }

  /**
   * Получение предпочтений пользователя по мессенджерам
   */
  @Get('messenger-preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение предпочтений пользователя по мессенджерам' })
  @ApiResponse({ status: 200, description: 'Предпочтения пользователя' })
  async getMessengerPreferences(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.phoneAuthService.getUserMessengerPreferences(userId);
  }

  /**
   * Обновление предпочтений пользователя по мессенджерам
   */
  @Post('messenger-preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновление предпочтений пользователя по мессенджерам' })
  @ApiResponse({ status: 200, description: 'Предпочтения обновлены' })
  async updateMessengerPreferences(
    @Req() req: Request,
    @Body() preferences: {
      whatsapp: boolean;
      telegram: boolean;
      preferred: 'whatsapp' | 'telegram' | null;
    },
  ) {
    const userId = (req as any).user.userId;
    return this.phoneAuthService.updateMessengerPreferences(userId, preferences);
  }

  // Phone authentication endpoints

  /**
   * Отправка кода подтверждения на телефон
   */
  @Post('phone/send-code')
  @Public()
  @ApiOperation({ summary: 'Отправка кода подтверждения на телефон' })
  @ApiResponse({ status: 200, description: 'Код отправлен' })
  @ApiResponse({ status: 400, description: 'Ошибка отправки кода' })
  async sendPhoneCode(
    @Body() body: {
      phoneNumber: string;
      messengerType: 'WHATSAPP' | 'TELEGRAM';
      purpose: 'login' | 'registration' | 'verification';
    },
  ) {
    const { phoneNumber, messengerType, purpose } = body;
    // Генерируем случайный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return this.phoneAuthService.sendCode(phoneNumber, code, messengerType.toLowerCase() as 'whatsapp' | 'telegram', purpose);
  }

  /**
   * Проверка кода подтверждения телефона
   */
  @Post('phone/verify')
  @Public()
  @ApiOperation({ summary: 'Проверка кода подтверждения телефона' })
  @ApiResponse({ status: 200, description: 'Код подтвержден' })
  @ApiResponse({ status: 400, description: 'Неверный код' })
  async verifyPhoneCode(
    @Body() body: {
      phoneNumber: string;
      messengerType: 'WHATSAPP' | 'TELEGRAM';
      code: string;
      purpose: 'login' | 'registration' | 'verification';
    },
  ) {
    const { phoneNumber, messengerType, code, purpose } = body;
    return this.phoneAuthService.verifyCode(phoneNumber, messengerType, code, purpose);
  }

  // OAuth endpoints

  /**
   * Получение URL для авторизации через GitHub
   */
  @Get('oauth/github/url')
  @Public()
  @ApiOperation({ summary: 'Получение URL для авторизации через GitHub' })
  @ApiQuery({ name: 'state', required: false, description: 'Состояние для защиты от CSRF' })
  @ApiQuery({ name: 'bind', required: false, description: 'Привязка к существующему аккаунту' })
  @ApiQuery({ name: 'userId', required: false, description: 'ID пользователя для привязки' })
  @ApiQuery({ name: 'forceLogin', required: false, description: 'Принудительный выбор аккаунта' })
  @ApiResponse({ status: 200, description: 'URL для авторизации' })
  @ApiResponse({ status: 400, description: 'OAuth не настроен' })
  async getGitHubAuthUrl(
    @Query('state') state?: string,
    @Query('bind') bind?: string,
    @Query('userId') userId?: string,
    @Query('forceLogin') forceLogin?: string,
  ) {
    try {
      // Если это привязка к существующему аккаунту, добавляем параметры в state
      let finalState = state;
      if (bind === 'true' && userId) {
        const stateData = {
          bind: true,
          userId: userId,
          originalState: state || Math.random().toString(36).substring(2, 15)
        };
        finalState = Buffer.from(JSON.stringify(stateData)).toString('base64');
        this.logger.log(`🔍 GitHub OAuth URL for binding: userId=${userId}, state=${finalState}`);
      } else {
        // Для обычной авторизации генерируем случайный state
        finalState = finalState || Math.random().toString(36).substring(2, 15);
        this.logger.log(`🔍 GitHub OAuth URL for regular auth: state=${finalState}`);
      }
      
      const shouldForceLogin = forceLogin === 'true';
      const authUrl = this.githubAuthService.getAuthUrl(finalState, shouldForceLogin);
      return { url: authUrl };
    } catch (error) {
      this.logger.error(`GitHub OAuth error: ${error.message}`);
      return {
        error: 'GitHub OAuth не настроен',
        message: 'Пожалуйста, создайте OAuth App на https://github.com/settings/developers и добавьте GITHUB_CLIENT_ID в .env',
        helpUrl: 'https://github.com/settings/developers'
      };
    }
  }

  /**
   * Обработка callback от GitHub
   */
  @Get('oauth/github/callback')
  @Public()
  @ApiOperation({ summary: 'Обработка callback от GitHub' })
  @ApiQuery({ name: 'code', description: 'Код авторизации' })
  @ApiQuery({ name: 'state', required: false, description: 'Состояние' })
  async handleGitHubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.logger.log(`GitHub OAuth callback received: code=${code?.substring(0, 10)}..., state=${state}`);
    
    try {
      // Извлекаем параметры из state
      let bind = false;
      let userId: string | undefined;
      
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.bind && stateData.userId) {
          bind = true;
          userId = stateData.userId;
          this.logger.log(`🔍 GitHub OAuth binding mode: userId=${userId}`);
        } else {
          this.logger.log(`🔍 GitHub OAuth regular mode: state=${state}`);
        }
      } catch (e) {
        // Если не удалось декодировать state, это обычная авторизация
        this.logger.log(`🔍 GitHub OAuth regular mode (state decode failed): ${e.message}`);
      }
      
      const result = await this.githubAuthService.handleCallback(code, state, bind, userId);
      
      this.logger.log(`GitHub OAuth callback result: success=${result.success}, user=${result.user?.email || 'none'}`);
      
      if (result.success) {
        // GitHub auth service now handles binding internally
        // If bind=true, result.user is already the current user with GitHub added
        
        // Проверяем, включена ли nFA (приоритет над legacy 2FA)
        if (result.user.mfaSettings?.enabled && result.user.mfaSettings.methods?.length > 0) {
          // nFA включена - редиректим на страницу ввода кодов
          // Коды будут отправлены фронтендом, чтобы избежать дублирования
          this.logger.log(`nFA required for GitHub user ${result.user.id}, methods: ${JSON.stringify(result.user.mfaSettings.methods)}`);
          
          const frontendUrl = process.env.FRONTEND_URL || 'https://vselena.ldmco.ru';
          // Редиректим на страницу nFA с параметрами
          const redirectUrl = `${frontendUrl}/index.html?nfa=true&userId=${result.user.id}&methods=${encodeURIComponent(JSON.stringify(result.user.mfaSettings.methods))}`;
          this.logger.log(`GitHub OAuth redirecting to nFA page: ${redirectUrl}`);
          return res.redirect(redirectUrl);
        }
        
        // Генерируем JWT токены для пользователя через AuthService
        const accessToken = await this.authService.generateAccessToken(result.user);
        const refreshToken = await this.authService.generateRefreshToken(result.user);
        
        this.logger.log(`GitHub OAuth tokens generated: accessToken=${accessToken.substring(0, 20)}..., refreshToken=${refreshToken.substring(0, 20)}...`);
        
        // Перенаправляем на dashboard с токенами
        const frontendUrl = process.env.FRONTEND_URL || 'https://vselena.ldmco.ru';
        const redirectUrl = `${frontendUrl}/dashboard.html?token=${accessToken}&refreshToken=${refreshToken}`;
        this.logger.log(`GitHub OAuth redirecting to: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      } else {
        this.logger.error(`GitHub OAuth failed: ${result.error}`);
        // Перенаправляем на главную с ошибкой
        const frontendUrl = process.env.FRONTEND_URL || 'https://vselena.ldmco.ru';
        const redirectUrl = `${frontendUrl}/index.html?error=${encodeURIComponent(result.error || 'Unknown error')}`;
        this.logger.log(`GitHub OAuth redirecting to error page: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }
    } catch (error) {
      this.logger.error(`GitHub OAuth callback error: ${error.message}`);
      this.logger.error(error.stack);
      const frontendUrl = process.env.FRONTEND_URL || 'https://vselena.ldmco.ru';
      const redirectUrl = `${frontendUrl}/index.html?error=${encodeURIComponent(error.message || 'Unknown error')}`;
      this.logger.log(`GitHub OAuth redirecting to error page: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    }
  }

  /**
   * Получение URL для авторизации через VKontakte
   */
  @Get('oauth/vkontakte')
  @Public()
  @ApiOperation({ summary: 'Получение URL для авторизации через VKontakte' })
  @ApiQuery({ name: 'state', required: false, description: 'Состояние для защиты от CSRF' })
  @ApiResponse({ status: 200, description: 'URL для авторизации' })
  async getVKontakteAuthUrl(@Query('state') state?: string) {
    const authUrl = this.vkontakteAuthService.getAuthUrl(state);
    return { authUrl };
  }

  /**
   * Обработка callback от VKontakte
   */
  @Get('oauth/vkontakte/callback')
  @Public()
  @ApiOperation({ summary: 'Обработка callback от VKontakte' })
  @ApiQuery({ name: 'code', description: 'Код авторизации' })
  @ApiQuery({ name: 'state', required: false, description: 'Состояние' })
  async handleVKontakteCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.vkontakteAuthService.handleCallback(code, state);
    
    if (result.success) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;
      return res.redirect(redirectUrl);
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/error?error=${encodeURIComponent(result.error || 'Unknown error')}`;
      return res.redirect(redirectUrl);
    }
  }

  /**
   * Получение URL для авторизации через Госуслуги
   */
  @Get('oauth/gosuslugi')
  @Public()
  @ApiOperation({ summary: 'Получение URL для авторизации через Госуслуги' })
  @ApiQuery({ name: 'state', required: false, description: 'Состояние для защиты от CSRF' })
  @ApiResponse({ status: 200, description: 'URL для авторизации' })
  async getGosuslugiAuthUrl(@Query('state') state?: string) {
    const authUrl = this.gosuslugiAuthService.getAuthUrl(state);
    return { authUrl };
  }

  /**
   * Обработка callback от Госуслуг
   */
  @Get('oauth/gosuslugi/callback')
  @Public()
  @ApiOperation({ summary: 'Обработка callback от Госуслуг' })
  @ApiQuery({ name: 'code', description: 'Код авторизации' })
  @ApiQuery({ name: 'state', required: false, description: 'Состояние' })
  async handleGosuslugiCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.gosuslugiAuthService.handleCallback(code, state);
    
    if (result.success) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;
      return res.redirect(redirectUrl);
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/error?error=${encodeURIComponent(result.error || 'Unknown error')}`;
      return res.redirect(redirectUrl);
    }
  }

  /**
   * Обработка Telegram Login Widget
   */
  @Post('telegram-login')
  @Public()
  @ApiOperation({ summary: 'Обработка Telegram Login Widget' })
  async handleTelegramLogin(@Body() body: { telegramUser?: any; bind?: boolean; userId?: string } | any) {
    this.logger.log(`Telegram Login request received. Body keys: ${Object.keys(body).join(', ')}`);
    this.logger.log(`Telegram Login body (first 300 chars): ${JSON.stringify(body).substring(0, 300)}`);
    
    const telegramUser = body.telegramUser || body;
    const { bind, userId } = body;
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = telegramUser;
    
    this.logger.log(`Telegram Login: ${username || first_name} (${id}), bind=${bind}, userId=${userId}`);
    
    // Проверяем hash для безопасности
    // TODO: Добавить проверку hash
    
    if (bind && userId) {
      // This is a binding request - add Telegram to existing user
      this.logger.log(`Telegram binding request for user ${userId}`);
      
      const currentUser = await this.multiAuthService['usersRepo'].findOne({ where: { id: userId } });
      
      if (!currentUser) {
        this.logger.error(`Current user ${userId} not found`);
        throw new Error('User not found');
      }
      
      this.logger.log(`Current user: ${currentUser.email}, available methods: ${JSON.stringify(currentUser.availableAuthMethods)}`);
      
      // Check if there's already a Telegram account with this ID
      const telegramId = id?.toString();
      this.logger.log(`Checking for existing Telegram account with ID: ${telegramId}`);
      
      if (telegramId) {
        const existingTelegramUser = await this.multiAuthService['usersRepo']
          .createQueryBuilder('user')
          .where('"user"."messengerMetadata"::jsonb->\'telegram\'->>\'userId\' = :telegramId', { telegramId })
          .getOne();
        
        this.logger.log(`Telegram account search result: ${existingTelegramUser ? `found ${existingTelegramUser.email}` : 'not found'}`);
        this.logger.log(`Current user ID: ${userId}, Existing Telegram user ID: ${existingTelegramUser?.id}`);
        this.logger.log(`Should merge? ${existingTelegramUser && existingTelegramUser.id !== userId}`);
        
        if (existingTelegramUser && existingTelegramUser.id !== userId) {
          // There's already a Telegram account - need to merge
          this.logger.log(`Found existing Telegram account: ${existingTelegramUser.email}, merging into current user: ${currentUser.email}`);
          
          // Merge Telegram data into CURRENT user (not the other way around)
          // Add Telegram to current user's available methods
          if (!currentUser.availableAuthMethods.includes(AuthMethodType.PHONE_TELEGRAM)) {
            currentUser.availableAuthMethods.push(AuthMethodType.PHONE_TELEGRAM);
          }
          
          // Copy Telegram metadata to current user
          if (!currentUser.messengerMetadata) {
            currentUser.messengerMetadata = {} as any;
          }
          const metadata = currentUser.messengerMetadata as any;
          metadata.telegram = (existingTelegramUser.messengerMetadata as any)?.telegram || { userId: telegramId, username: username || '' };
          currentUser.phoneVerified = true;
          
          // Copy avatar if current user doesn't have one
          if (existingTelegramUser.avatarUrl && !currentUser.avatarUrl) {
            currentUser.avatarUrl = existingTelegramUser.avatarUrl;
          }
          
          // Save current user with Telegram data
          const mergedUser = await this.multiAuthService['usersRepo'].save(currentUser);
          this.logger.log(`Telegram data merged into current user ${currentUser.email}`);
          
          // Delete the old Telegram-only account
          await this.multiAuthService['usersRepo'].remove(existingTelegramUser);
          this.logger.log(`Old Telegram account ${existingTelegramUser.email} deleted after merge`);
          
          const tokens = await this.generateTokens(mergedUser);
          
          return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: mergedUser,
            merged: true,
            message: 'Аккаунты успешно объединены'
          };
        }
      }
      
      // Check if Telegram is already connected
          if (!currentUser.availableAuthMethods.includes(AuthMethodType.PHONE_TELEGRAM)) {
            currentUser.availableAuthMethods.push(AuthMethodType.PHONE_TELEGRAM);
            // Extract telegram user ID from telegramUser object
            const telegramId = id?.toString();
            if (telegramId) {
              // Store telegram metadata
              if (!currentUser.messengerMetadata) {
                currentUser.messengerMetadata = {} as any;
              }
              const metadata = currentUser.messengerMetadata as any;
              
              if (!metadata.telegram) {
                metadata.telegram = { userId: telegramId, username: username || '' };
              } else {
                metadata.telegram.userId = telegramId;
                metadata.telegram.username = username || '';
              }
              currentUser.phoneVerified = true;
            }
            if (photo_url && !currentUser.avatarUrl) {
              currentUser.avatarUrl = photo_url;
            }
            await this.multiAuthService['usersRepo'].save(currentUser);
            this.logger.log(`Telegram added to user ${userId} available methods`);
          } else {
            this.logger.log(`Telegram already connected to user ${userId}`);
          }
      
      // Generate tokens for CURRENT user
      const tokens = await this.generateTokens(currentUser);
      
      this.logger.log(`Tokens generated for current user ${userId}`);
      
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: currentUser,
      };
    }
    
    // Only find or create user if this is NOT a binding request
    // Находим или создаём пользователя
    try {
      const user = await this.multiAuthService.handleTelegramLogin(telegramUser);
      
      if (user) {
        // Проверяем, включена ли nFA (приоритет над legacy 2FA)
        if (user.mfaSettings?.enabled && user.mfaSettings.methods?.length > 0) {
          // nFA включена - требуем подтверждение всех методов
          // Коды будут отправлены фронтендом, чтобы избежать дублирования
          this.logger.log(`nFA required for Telegram user ${user.id}, methods: ${JSON.stringify(user.mfaSettings.methods)}`);
          const response = {
            requiresNFA: true,
            message: 'Требуется подтверждение всех выбранных методов защиты',
            userId: user.id,
            methods: user.mfaSettings.methods,
          };
          this.logger.log(`Returning nFA response: ${JSON.stringify(response)}`);
          return response;
        }
        
        // Генерируем токены
        this.logger.log(`Generating tokens for Telegram user ${user.id}`);
        const tokens = await this.generateTokens(user);
        this.logger.log(`Tokens generated successfully for user ${user.id}`);
        
        const response = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        };
        this.logger.log(`Returning success response for Telegram user ${user.id}`);
        return response;
      } else {
        this.logger.error('handleTelegramLogin returned null');
        throw new Error('Не удалось авторизовать пользователя');
      }
    } catch (error) {
      this.logger.error(`Error in handleTelegramLogin: ${error.message}`, error.stack);
      // Возвращаем объект ошибки вместо throw, чтобы фронтенд мог правильно обработать
      return {
        error: error.message || 'Неизвестная ошибка',
        message: error.message || 'Неизвестная ошибка',
      };
    }
  }

  private async generateTokens(user: any) {
    try {
      this.logger.log(`Starting token generation for user ${user.id}`);
      // Генерация токенов аналогично AuthService
      const accessToken = await this.multiAuthService.generateAccessToken(user);
      this.logger.log(`Access token generated for user ${user.id}`);
      const refreshToken = await this.multiAuthService.generateRefreshToken(user);
      this.logger.log(`Refresh token generated for user ${user.id}`);
      
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Error generating tokens for user ${user.id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Merge two user accounts
   */
  private async mergeTelegramAndGitHubAccounts(telegramUser: any, githubUser: any, telegramData: any): Promise<any> {
    this.logger.log(`Merging accounts: Telegram(${telegramUser.email}) + GitHub(${githubUser.email})`);
    
    // Merge available auth methods
    const mergedMethods = [...new Set([...telegramUser.availableAuthMethods, ...githubUser.availableAuthMethods])];
    
    // Merge user data - prioritize GitHub data for name/avatar, keep Telegram metadata
    const mergedUser = {
      ...telegramUser,
      // Keep GitHub data if it's more complete
      firstName: githubUser.firstName || telegramUser.firstName,
      lastName: githubUser.lastName || telegramUser.lastName,
      avatarUrl: githubUser.avatarUrl || telegramUser.avatarUrl,
      // Merge GitHub data
      githubId: githubUser.githubId,
      githubUsername: githubUser.githubUsername,
      githubVerified: githubUser.githubVerified,
      // Merge auth methods
      availableAuthMethods: mergedMethods,
      // Keep Telegram metadata
      messengerMetadata: telegramUser.messengerMetadata,
      phoneVerified: telegramUser.phoneVerified,
      // Merge OAuth metadata
      oauthMetadata: {
        ...telegramUser.oauthMetadata,
        ...githubUser.oauthMetadata
      }
    };
    
    // Save merged user
    const savedUser = await this.multiAuthService['usersRepo'].save(mergedUser);
    
    this.logger.log(`Accounts merged successfully. New user: ${savedUser.email}`);
    
    return savedUser;
  }
}