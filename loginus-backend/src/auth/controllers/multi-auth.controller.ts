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
    // ✅ КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ: Логируем ВСЕ входящие данные
    this.logger.log(`🚨🚨🚨 [bindAuthMethod] ========== METHOD CALLED ==========`);
    this.logger.log(`🚨 [bindAuthMethod] Request path: ${req.path}`);
    this.logger.log(`🚨 [bindAuthMethod] Request method: ${req.method}`);
    this.logger.log(`🚨 [bindAuthMethod] Body: ${JSON.stringify(body)}`);
    
    const userId = (req as any).user?.userId;
    this.logger.log(`🚨 [bindAuthMethod] User from request: ${JSON.stringify((req as any).user)}`);
    this.logger.log(`🚨 [bindAuthMethod] Extracted userId: ${userId}`);
    const { authMethod, identifier, password, verificationCode } = body;
    
    this.logger.log(`🔍 [bindAuthMethod] Called for user ${userId}, method: ${authMethod}, identifier: ${identifier}, hasPassword: ${!!password}`);
    this.logger.log(`🔍 [bindAuthMethod] authMethod type: ${typeof authMethod}, value: ${authMethod}, AuthMethodType.EMAIL: ${AuthMethodType.EMAIL}`);
    this.logger.log(`🔍 [bindAuthMethod] Comparison: authMethod === AuthMethodType.EMAIL = ${authMethod === AuthMethodType.EMAIL}, authMethod === 'EMAIL' = ${authMethod === 'EMAIL'}`);
    
    // ✅ РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Логика привязки EMAIL аналогична GitHub
    if (authMethod === AuthMethodType.EMAIL && password) {
      this.logger.log(`✅ [bindAuthMethod] Processing EMAIL binding for user ${userId} with email ${identifier}`);
      
      // Получаем текущего пользователя
      const currentUser = await this.multiAuthService['usersRepo'].findOne({ where: { id: userId } });
      if (!currentUser) {
        return {
          success: false,
          error: 'Пользователь не найден',
        };
      }
      
      // Хешируем пароль
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Ищем существующий аккаунт с этим email (case-insensitive)
      this.logger.log(`🔍 [bindAuthMethod] Searching for existing user with email: ${identifier}`);
      const existingEmailUser = await this.multiAuthService['usersRepo']
        .createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email: identifier })
        .getOne();
      
      this.logger.log(`🔍 [bindAuthMethod] Existing email user: ${existingEmailUser ? `ID=${existingEmailUser.id}, email=${existingEmailUser.email}` : 'none'}`);
      this.logger.log(`🔍 [bindAuthMethod] Current user ID: ${userId}`);
      
      // Если найден другой пользователь с таким email - просто удаляем его
      if (existingEmailUser && existingEmailUser.id !== userId) {
        this.logger.log(`🗑️ [bindAuthMethod] Found existing email account: ${existingEmailUser.email}, deleting it...`);
        
        try {
          await this.multiAuthService['usersRepo'].remove(existingEmailUser);
          this.logger.log(`✅ [bindAuthMethod] Old account ${existingEmailUser.id} deleted successfully`);
        } catch (error) {
          this.logger.error(`❌ [bindAuthMethod] Ошибка при удалении старого аккаунта: ${error.message}`);
          // Пробуем через delete
          try {
            await this.multiAuthService['usersRepo'].delete(existingEmailUser.id);
            this.logger.log(`✅ [bindAuthMethod] Old account ${existingEmailUser.id} deleted via delete()`);
          } catch (deleteError) {
            this.logger.error(`❌ [bindAuthMethod] Не удалось удалить старый аккаунт: ${deleteError.message}`);
            return {
              success: false,
              error: `Не удалось удалить старый аккаунт с этой почтой`,
            };
          }
        }
      }
      
      // Теперь почта свободна - добавляем email к текущему пользователю
      this.logger.log(`✅ [bindAuthMethod] Email ${identifier} is now free, adding to current user`);
      
      // Обновляем email и пароль (как в GitHub обновляются githubId, githubUsername)
      currentUser.email = identifier;
      currentUser.emailVerified = true;
      currentUser.passwordHash = passwordHash;
      
      // Добавляем EMAIL в способы входа (ТОЧНО как в GitHub - строка 144-146)
      if (!currentUser.availableAuthMethods || !Array.isArray(currentUser.availableAuthMethods)) {
        currentUser.availableAuthMethods = [];
      }
      // Создаем новый массив вместо изменения существующего (для правильной работы с JSONB)
      if (!currentUser.availableAuthMethods.includes(AuthMethodType.EMAIL)) {
        currentUser.availableAuthMethods = [...currentUser.availableAuthMethods, AuthMethodType.EMAIL];
      }
      
      // Сохраняем пользователя (ТОЧНО как в GitHub - строка 161)
      const updatedUser = await this.multiAuthService['usersRepo'].save(currentUser);
      this.logger.log(`✅ [bindAuthMethod] Email ${identifier} bound to user ${userId}, available methods: ${JSON.stringify(updatedUser.availableAuthMethods)}`);
      
      // Возвращаем результат (ТОЧНО как в GitHub - строка 164-167)
      return {
        success: true,
        user: updatedUser,
      };
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
    @Req() req: Request,
    @Query('state') state?: string,
    @Query('bind') bind?: string,
    @Query('userId') userId?: string,
    @Query('forceLogin') forceLogin?: string,
    @Query('oauth_client_id') oauthClientIdFromQuery?: string,
    @Query('oauth_redirect_uri') oauthRedirectUriFromQuery?: string,
    @Query('oauth_scope') oauthScopeFromQuery?: string,
    @Query('oauth_state') oauthStateFromQuery?: string,
  ) {
    try {
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем OAuth параметры в state для передачи через GitHub
      // Это гарантирует, что параметры сохранятся при кросс-доменном редиректе
      // ✅ ПРИОРИТЕТ: Query параметры > Cookies (query параметры более надежны)
      const oauthClientId = oauthClientIdFromQuery || req.cookies?.oauth_client_id;
      const oauthRedirectUri = oauthRedirectUriFromQuery || req.cookies?.oauth_redirect_uri;
      const oauthScope = oauthScopeFromQuery || req.cookies?.oauth_scope;
      const oauthState = oauthStateFromQuery || req.cookies?.oauth_state_param;
      
      this.logger.log(`🔍 [GitHub URL] OAuth params check:`, {
        oauthClientIdFromQuery: oauthClientIdFromQuery ? 'present' : 'missing',
        oauthRedirectUriFromQuery: oauthRedirectUriFromQuery ? 'present' : 'missing',
        oauthClientIdFromCookie: req.cookies?.oauth_client_id ? 'present' : 'missing',
        oauthRedirectUriFromCookie: req.cookies?.oauth_redirect_uri ? 'present' : 'missing',
        finalOauthClientId: oauthClientId ? 'present' : 'missing',
        finalOauthRedirectUri: oauthRedirectUri ? 'present' : 'missing',
        oauthScope: oauthScope ? 'present' : 'missing',
        oauthState: oauthState ? 'present' : 'missing',
        allCookies: Object.keys(req.cookies || {}).filter(k => k.startsWith('oauth_')),
        cookieHeader: req.headers.cookie ? 'present' : 'missing',
      });
      
      // Если это привязка к существующему аккаунту, добавляем параметры в state
      let stateData: any = {};
      
      if (bind === 'true' && userId) {
        stateData = {
          bind: true,
          userId: userId,
          originalState: state || Math.random().toString(36).substring(2, 15)
        };
        this.logger.log(`🔍 GitHub OAuth URL for binding: userId=${userId}`);
      } else {
        // Для обычной авторизации используем переданный state или генерируем новый
        stateData.originalState = state || Math.random().toString(36).substring(2, 15);
      }
      
      // ✅ ВАЖНО: Добавляем OAuth параметры в state (если они есть)
      // Это гарантирует, что они сохранятся при переходе на GitHub и обратно
      if (oauthClientId && oauthRedirectUri) {
        stateData.client_id = oauthClientId;
        stateData.redirect_uri = oauthRedirectUri;
        if (oauthScope) {
          stateData.scope = oauthScope;
        }
        if (oauthState) {
          stateData.oauth_state = oauthState;
        }
        this.logger.log(`✅ [GitHub URL] Added OAuth params to state: client_id=${oauthClientId}, redirect_uri=${oauthRedirectUri}`);
      }
      
      // Кодируем state в base64
      const finalState = Buffer.from(JSON.stringify(stateData)).toString('base64');
      this.logger.log(`🔍 GitHub OAuth URL state: ${finalState.substring(0, 50)}...`);
      
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
  @ApiQuery({ name: 'client_id', required: false, description: 'OAuth client_id (может быть в state)' })
  @ApiQuery({ name: 'redirect_uri', required: false, description: 'OAuth redirect_uri (может быть в state)' })
  async handleGitHubCallback(
    @Query('code') code: string,
    @Query('state') state: string | undefined,
    @Query('client_id') clientIdFromQuery: string | undefined,
    @Query('redirect_uri') redirectUriFromQuery: string | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    this.logger.log(`GitHub OAuth callback received: code=${code?.substring(0, 10)}..., state=${state}`);
    this.logger.log(`🔍 [GitHub Callback] Query params: client_id=${clientIdFromQuery || 'none'}, redirect_uri=${redirectUriFromQuery || 'none'}`);
    
    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: GitHub всегда перенаправляет через браузер (GET запрос)
    // Нужно перенаправить на frontend, чтобы frontend обработал callback через AJAX
    // Исключение: если это AJAX запрос от frontend (с заголовком Accept: application/json БЕЗ text/html)
    const xRequestedWith = (req.headers['x-requested-with'] || '').toLowerCase();
    const acceptHeader = (req.headers.accept || '').toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    // ✅ УЛУЧШЕННАЯ ЛОГИКА: AJAX запрос - если есть X-Requested-With ИЛИ Accept: application/json (без text/html)
    // Frontend делает fetch с Accept: application/json, но без X-Requested-With
    // GitHub всегда перенаправляет через браузер с Accept: text/html или без Accept
    const isExplicitAjax = xRequestedWith === 'xmlhttprequest' || 
                          (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html'));
    
    // ✅ ЛОГИКА: Если это GET запрос с code и НЕ явный AJAX - это браузерный запрос от GitHub
    // Всегда перенаправляем на frontend, чтобы frontend обработал callback
    const shouldRedirect = !isExplicitAjax && code && req.method === 'GET';
    
    // ✅ ЛОГИРОВАНИЕ: Выводим информацию о запросе для отладки
    this.logger.log(`🔍 [GitHub Callback] Request check:`, {
      method: req.method,
      hasCode: !!code,
      acceptHeader: acceptHeader || 'none',
      userAgent: userAgent.substring(0, 50) || 'none',
      xRequestedWith: xRequestedWith || 'none',
      isExplicitAjax,
      shouldRedirect,
      allHeaders: JSON.stringify({
        accept: req.headers.accept,
        'x-requested-with': req.headers['x-requested-with'],
        'user-agent': req.headers['user-agent']?.substring(0, 50)
      })
    });
    
    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда перенаправляем браузерные запросы на frontend
    if (shouldRedirect) {
      // Это браузерный запрос от GitHub - перенаправляем на frontend страницу для обработки
      const frontendUrl = process.env.FRONTEND_URL || 'https://loginus.startapus.com';
      const redirectUrl = `${frontendUrl}/github-login.html?code=${code}${state ? '&state=' + encodeURIComponent(state) : ''}`;
      this.logger.log(`🔄 Redirecting browser request to frontend: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    }
    
    // ✅ ЛОГИРОВАНИЕ: Если редирект не произошел, логируем почему
    if (code && req.method === 'GET') {
      this.logger.log(`⚠️ [GitHub Callback] No redirect - isExplicitAjax=${isExplicitAjax}, will process as AJAX`);
    }
    
    try {
      // Извлекаем параметры из state
      let bind = false;
      let userId: string | undefined;
      
      if (state) {
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
      } else {
        this.logger.log(`🔍 GitHub OAuth regular mode: no state parameter`);
      }
      
      // ✅ УПРОЩЕНИЕ: Делаем как Telegram - обрабатываем code один раз и возвращаем JSON
      // ✅ ОБРАБОТКА ОШИБОК: Оборачиваем в try-catch для обработки всех ошибок
      let result;
      try {
        result = await this.githubAuthService.handleCallback(code, state, bind, userId);
        this.logger.log(`GitHub OAuth callback result: success=${result.success}, user=${result.user?.email || 'none'}`);
      } catch (callbackError) {
        // Если произошла ошибка при обработке callback, возвращаем JSON с ошибкой
        this.logger.error(`GitHub OAuth callback processing error: ${callbackError.message}`);
        this.logger.error(callbackError.stack);
        return res.status(500).json({
          error: callbackError.message || 'Internal server error',
          message: callbackError.message || 'Internal server error',
        });
      }
      
      if (result.success) {
        // GitHub auth service now handles binding internally
        // If bind=true, result.user is already the current user with GitHub added
        
        // ✅ ИСПРАВЛЕНИЕ: Если это привязка (bind), пользователь уже авторизован
        // Не нужно проверять nFA и редиректить на вход - сразу редиректим на dashboard
        if (bind && userId) {
          this.logger.log(`✅ GitHub привязан к пользователю ${userId}, редиректим на dashboard`);
          
          // Генерируем токены для пользователя
          const accessToken = await this.authService.generateAccessToken(result.user);
          const refreshToken = await this.authService.generateRefreshToken(result.user);
          
          // Редиректим на dashboard с токенами
          const frontendUrl = process.env.FRONTEND_URL || 'https://loginus.startapus.com';
          const redirectUrl = `${frontendUrl}/dashboard.html?token=${accessToken}&refreshToken=${refreshToken}&tab=settings&message=${encodeURIComponent('GitHub успешно привязан')}`;
          this.logger.log(`GitHub binding redirecting to: ${redirectUrl}`);
          return res.redirect(redirectUrl);
        }
        
        // Проверяем, включена ли nFA (приоритет над legacy 2FA)
        // Только для обычной регистрации/входа, не для привязки
        if (result.user.mfaSettings?.enabled && result.user.mfaSettings.methods?.length > 0) {
          // nFA включена - редиректим на страницу ввода кодов
          // Коды будут отправлены фронтендом, чтобы избежать дублирования
          this.logger.log(`nFA required for GitHub user ${result.user.id}, methods: ${JSON.stringify(result.user.mfaSettings.methods)}`);
          
          const frontendUrl = process.env.FRONTEND_URL || 'https://loginus.startapus.com';
          
          // ✅ СОХРАНЕНИЕ OAuth ПАРАМЕТРОВ: Проверяем, действительно ли это OAuth flow
          // Проверяем специальный cookie-флаг, который устанавливается только при реальном OAuth flow
          // Также проверяем referer как дополнительный признак
          const referer = req.headers.referer || '';
          const oauthFlowFlag = req.cookies?.oauth_flow_active === 'true';
          const isOAuthFlow = oauthFlowFlag || referer.includes('/oauth/authorize') || referer.includes('/api/oauth/authorize');
          
          const oauthClientId = req.cookies?.oauth_client_id;
          const oauthRedirectUri = req.cookies?.oauth_redirect_uri;
          
          // Редиректим на страницу nFA с параметрами
          const redirectUrl = new URL(`${frontendUrl}/index.html`);
          redirectUrl.searchParams.set('nfa', 'true');
          redirectUrl.searchParams.set('userId', result.user.id);
          redirectUrl.searchParams.set('methods', encodeURIComponent(JSON.stringify(result.user.mfaSettings.methods)));
          
          // ✅ ИСПРАВЛЕНИЕ: Добавляем OAuth параметры ТОЛЬКО если это действительно OAuth flow
          // Если это обычный вход (не через OAuth), очищаем OAuth cookies
          if (isOAuthFlow && oauthClientId && oauthRedirectUri) {
            this.logger.log(`✅ OAuth flow detected in GitHub nFA (referer: ${referer}, flag: ${oauthFlowFlag}), adding OAuth params to nFA redirect URL`);
            redirectUrl.searchParams.set('oauth_flow', 'true');
            redirectUrl.searchParams.set('return_to', '/api/oauth/authorize');
            redirectUrl.searchParams.set('client_id', oauthClientId);
          } else {
            // Обычный вход - очищаем OAuth cookies
            this.logger.log(`ℹ️ Regular GitHub login with nFA (not OAuth flow), clearing OAuth cookies`);
            res.clearCookie('oauth_flow_active');
            res.clearCookie('oauth_client_id');
            res.clearCookie('oauth_redirect_uri');
            res.clearCookie('oauth_scope');
            res.clearCookie('oauth_state_param');
          }
          
          this.logger.log(`GitHub OAuth redirecting to nFA page: ${redirectUrl.toString()}`);
          return res.redirect(redirectUrl.toString());
        }
        
        // Генерируем JWT токены для пользователя через AuthService
        const accessToken = await this.authService.generateAccessToken(result.user);
        const refreshToken = await this.authService.generateRefreshToken(result.user);
        
        this.logger.log(`GitHub OAuth tokens generated: accessToken=${accessToken.substring(0, 20)}..., refreshToken=${refreshToken.substring(0, 20)}...`);
        
        // ✅ ПРОВЕРКА OAuth FLOW: Проверяем, действительно ли это OAuth flow
        // Проверяем специальный cookie-флаг, который устанавливается только при реальном OAuth flow
        // Также проверяем referer как дополнительный признак
        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем также query параметры (могут быть переданы через state)
        const referer = req.headers.referer || '';
        const oauthFlowFlag = req.cookies?.oauth_flow_active === 'true';
        const isOAuthFlow = oauthFlowFlag || referer.includes('/oauth/authorize') || referer.includes('/api/oauth/authorize');
        
        // ✅ ПРИОРИТЕТ: Query параметры > Cookies (query параметры более надежны при кросс-доменных редиректах)
        const oauthClientId = clientIdFromQuery || req.cookies?.oauth_client_id;
        const oauthRedirectUri = redirectUriFromQuery || req.cookies?.oauth_redirect_uri;
        const oauthScope = req.cookies?.oauth_scope;
        const oauthState = req.cookies?.oauth_state_param;
        
        // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Пытаемся извлечь параметры из state (если они там есть)
        let stateClientId: string | undefined;
        let stateRedirectUri: string | undefined;
        if (state) {
          try {
            const decodedState = Buffer.from(state, 'base64').toString();
            this.logger.log(`🔍 [GitHub Callback] Decoded state: ${decodedState.substring(0, 200)}...`);
            const stateData = JSON.parse(decodedState);
            this.logger.log(`🔍 [GitHub Callback] Parsed state data:`, JSON.stringify(stateData, null, 2));
            if (stateData.client_id) {
              stateClientId = stateData.client_id;
              this.logger.log(`✅ [GitHub Callback] Found client_id in state: ${stateClientId}`);
            }
            if (stateData.redirect_uri) {
              stateRedirectUri = stateData.redirect_uri;
              this.logger.log(`✅ [GitHub Callback] Found redirect_uri in state: ${stateRedirectUri}`);
            }
            this.logger.log(`🔍 [GitHub Callback] Extracted from state: client_id=${stateClientId || 'none'}, redirect_uri=${stateRedirectUri || 'none'}`);
          } catch (e) {
            // State не содержит JSON, это нормально
            this.logger.log(`⚠️ [GitHub Callback] Failed to parse state: ${e.message}`);
            this.logger.log(`⚠️ [GitHub Callback] State value: ${state?.substring(0, 100)}...`);
          }
        } else {
          this.logger.log(`⚠️ [GitHub Callback] No state parameter provided`);
        }
        
        // ✅ ФИНАЛЬНЫЙ ПРИОРИТЕТ: Query > State > Cookies
        const finalClientId = oauthClientId || stateClientId;
        const finalRedirectUri = oauthRedirectUri || stateRedirectUri;
        
        // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ: Логируем все параметры для отладки
        this.logger.log(`🔍 [GitHub Callback] OAuth flow check:`, {
          oauthFlowFlag,
          referer,
          isOAuthFlow,
          clientIdFromQuery: clientIdFromQuery ? 'present' : 'missing',
          redirectUriFromQuery: redirectUriFromQuery ? 'present' : 'missing',
          oauthClientIdFromCookie: req.cookies?.oauth_client_id ? 'present' : 'missing',
          oauthRedirectUriFromCookie: req.cookies?.oauth_redirect_uri ? 'present' : 'missing',
          stateClientId: stateClientId ? 'present' : 'missing',
          stateRedirectUri: stateRedirectUri ? 'present' : 'missing',
          finalClientId: finalClientId ? 'present' : 'missing',
          finalRedirectUri: finalRedirectUri ? 'present' : 'missing',
          oauthScope: oauthScope ? 'present' : 'missing',
          oauthState: oauthState ? 'present' : 'missing',
          allCookies: Object.keys(req.cookies || {}).filter(k => k.startsWith('oauth_'))
        });
        
        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Делаем как Telegram - возвращаем JSON вместо редиректа
        // Frontend обработает ответ и редиректит на /api/oauth/authorize при OAuth flow
        // Это позволяет frontend проверить OAuth flow и правильно обработать редирект
        // ✅ ИСПОЛЬЗУЕМ ФИНАЛЬНЫЕ ЗНАЧЕНИЯ (из query, state или cookies)
        const hasOAuthParams = !!(finalClientId || finalRedirectUri);
        const isOAuthFlowForResponse = oauthFlowFlag || 
                                       referer.includes('/oauth/authorize') || 
                                       referer.includes('/api/oauth/authorize') ||
                                       hasOAuthParams;
        
        this.logger.log(`🔍 [GitHub] OAuth flow check for response:`, {
          oauthFlowFlag,
          referer,
          hasOAuthParams,
          finalClientId: finalClientId ? 'present' : 'missing',
          finalRedirectUri: finalRedirectUri ? 'present' : 'missing',
          isOAuthFlowForResponse,
          allCookies: Object.keys(req.cookies || {}).filter(k => k.startsWith('oauth_'))
        });
        
        // ✅ ИСПРАВЛЕНИЕ: Возвращаем JSON ответ (как Telegram), чтобы frontend мог обработать OAuth flow
        const response: any = {
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
        };
        
        // ✅ Добавляем OAuth флаги ТОЛЬКО если это действительно OAuth flow
        // ✅ ИСПОЛЬЗУЕМ ФИНАЛЬНЫЕ ЗНАЧЕНИЯ (из query, state или cookies)
        if (isOAuthFlowForResponse && finalClientId && finalRedirectUri) {
          this.logger.log(`✅ OAuth flow detected in GitHub callback, adding oauthFlow flag to response (like Telegram)`);
          this.logger.log(`OAuth params: client_id=${finalClientId}, redirect_uri=${finalRedirectUri}`);
          
          response.oauthFlow = true;
          response.returnTo = '/api/oauth/authorize';
          response.clientId = finalClientId;
          response.redirectUri = finalRedirectUri;
          
          // Сохраняем параметры в cookies для frontend (используем финальные значения)
          const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'none' as const,
            maxAge: 600000,
            path: '/',
          };
          
          res.cookie('oauth_flow_active', 'true', cookieOptions);
          res.cookie('oauth_client_id', finalClientId, cookieOptions);
          res.cookie('oauth_redirect_uri', finalRedirectUri, cookieOptions);
          res.cookie('oauth_scope', oauthScope || 'openid email profile', cookieOptions);
          if (oauthState) {
            res.cookie('oauth_state_param', oauthState, cookieOptions);
          }
          
          this.logger.log(`✅ [GitHub] Added OAuth flags to response, frontend will handle redirect`);
        } else {
          // Обычный вход - очищаем OAuth cookies
          this.logger.log(`ℹ️ Regular GitHub login (not OAuth flow), clearing OAuth cookies`);
          this.logger.log(`🔍 [GitHub Callback] OAuth flow condition failed:`, {
            isOAuthFlowForResponse,
            hasFinalClientId: !!finalClientId,
            hasFinalRedirectUri: !!finalRedirectUri,
            clientIdFromQuery: !!clientIdFromQuery,
            redirectUriFromQuery: !!redirectUriFromQuery,
            clientIdFromCookie: !!req.cookies?.oauth_client_id,
            redirectUriFromCookie: !!req.cookies?.oauth_redirect_uri,
            clientIdFromState: !!stateClientId,
            redirectUriFromState: !!stateRedirectUri,
            reason: !isOAuthFlowForResponse ? 'not OAuth flow' : !finalClientId ? 'missing client_id' : !finalRedirectUri ? 'missing redirect_uri' : 'unknown'
          });
          res.clearCookie('oauth_flow_active');
          res.clearCookie('oauth_client_id');
          res.clearCookie('oauth_redirect_uri');
          res.clearCookie('oauth_scope');
          res.clearCookie('oauth_state_param');
        }
        
        // ✅ УПРОЩЕНИЕ: Всегда возвращаем JSON (как Telegram)
        // Frontend (github-login.html) обработает JSON и редиректит на /api/oauth/authorize или dashboard
        this.logger.log(`Returning JSON response (GitHub user ${result.user.id}, OAuth flow: ${isOAuthFlowForResponse && finalClientId && finalRedirectUri ? 'yes' : 'no'})`);
        return res.json(response);
      } else {
        // ✅ ИСПРАВЛЕНИЕ: Возвращаем JSON с ошибкой (как Telegram), а не редирект
        // Frontend ожидает JSON ответ и обработает ошибку
        this.logger.error(`GitHub OAuth failed: ${result.error}`);
        return res.status(400).json({
          error: result.error || 'Unknown error',
          message: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      // ✅ ИСПРАВЛЕНИЕ: Возвращаем JSON с ошибкой (как Telegram), а не редирект
      // Frontend ожидает JSON ответ и обработает ошибку
      this.logger.error(`GitHub OAuth callback error: ${error.message}`);
      this.logger.error(error.stack);
      return res.status(500).json({
        error: error.message || 'Internal server error',
        message: error.message || 'Internal server error',
      });
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
  async handleTelegramLogin(
    @Body() body: { telegramUser?: any; bind?: boolean; userId?: string } | any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
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
          
          return res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: mergedUser,
            merged: true,
            message: 'Аккаунты успешно объединены'
          });
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
      
          return res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: currentUser,
          });
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
          
          // ✅ СОХРАНЕНИЕ OAuth ПАРАМЕТРОВ: Проверяем, действительно ли это OAuth flow
          // Проверяем специальный cookie-флаг, который устанавливается только при реальном OAuth flow
          // Также проверяем referer как дополнительный признак
          const referer = req.headers.referer || '';
          const oauthFlowFlag = req.cookies?.oauth_flow_active === 'true';
          const isOAuthFlow = oauthFlowFlag || referer.includes('/oauth/authorize') || referer.includes('/api/oauth/authorize');
          
          const oauthClientId = req.cookies?.oauth_client_id;
          const oauthRedirectUri = req.cookies?.oauth_redirect_uri;
          
          const response: any = {
            requiresNFA: true,
            message: 'Требуется подтверждение всех выбранных методов защиты',
            userId: user.id,
            methods: user.mfaSettings.methods,
          };
          
          // ✅ ИСПРАВЛЕНИЕ: Добавляем OAuth флаги ТОЛЬКО если это действительно OAuth flow
          // Если это обычный вход (не через OAuth), очищаем OAuth cookies
          if (isOAuthFlow && (oauthClientId || oauthRedirectUri)) {
            this.logger.log(`✅ OAuth flow detected for Telegram nFA (referer: ${referer}), adding OAuth flags to response`);
            response.oauthFlow = true;
            response.returnTo = '/api/oauth/authorize';
            if (oauthClientId) {
              response.clientId = oauthClientId;
            }
          } else {
            // Обычный вход - очищаем OAuth cookies
            this.logger.log(`ℹ️ Regular Telegram login (not OAuth flow), clearing OAuth cookies`);
            res.clearCookie('oauth_client_id');
            res.clearCookie('oauth_redirect_uri');
            res.clearCookie('oauth_scope');
            res.clearCookie('oauth_state_param');
          }
          
          this.logger.log(`Returning nFA response: ${JSON.stringify(response)}`);
          return res.json(response);
        }
        
        // Генерируем токены
        this.logger.log(`Generating tokens for Telegram user ${user.id}`);
        const tokens = await this.generateTokens(user);
        this.logger.log(`Tokens generated successfully for user ${user.id}`);
        
        // ✅ ПРОВЕРКА OAuth FLOW: Проверяем, действительно ли это OAuth flow
        // Проверяем referer - если запрос пришел из /oauth/authorize, это OAuth flow
        const referer = req.headers.referer || '';
        const isOAuthFlow = referer.includes('/oauth/authorize') || referer.includes('/api/oauth/authorize');
        
        const oauthClientId = req.cookies?.oauth_client_id;
        const oauthRedirectUri = req.cookies?.oauth_redirect_uri;
        
        const response: any = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        };
        
        // ✅ ИСПРАВЛЕНИЕ: Добавляем OAuth флаг ТОЛЬКО если это действительно OAuth flow
        if (isOAuthFlow && oauthClientId && oauthRedirectUri) {
          this.logger.log(`OAuth flow detected in Telegram login (referer: ${referer}), adding oauthFlow flag`);
          response.oauthFlow = true;
          response.returnTo = '/api/oauth/authorize';
        } else {
          // Обычный вход - очищаем OAuth cookies
          this.logger.log(`ℹ️ Regular Telegram login (not OAuth flow), clearing OAuth cookies`);
          res.clearCookie('oauth_client_id');
          res.clearCookie('oauth_redirect_uri');
          res.clearCookie('oauth_scope');
          res.clearCookie('oauth_state_param');
        }
        
        this.logger.log(`Returning success response for Telegram user ${user.id}`);
        return res.json(response);
      } else {
        this.logger.error('handleTelegramLogin returned null');
        throw new Error('Не удалось авторизовать пользователя');
      }
    } catch (error) {
      this.logger.error(`Error in handleTelegramLogin: ${error.message}`, error.stack);
      // Возвращаем объект ошибки вместо throw, чтобы фронтенд мог правильно обработать
      return res.status(400).json({
        error: error.message || 'Неизвестная ошибка',
        message: error.message || 'Неизвестная ошибка',
      });
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