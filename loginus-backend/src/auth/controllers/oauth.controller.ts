import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Res,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { OAuthService } from '../services/oauth.service';
import { AuthService } from '../auth.service';
import { Public } from '../decorators/public.decorator';
import { OAuthTokenDto } from '../dto/oauth-token.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RequireRoles } from '../decorators/roles.decorator';
import * as crypto from 'crypto';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    private authService: AuthService,
  ) {}

  /**
   * GET /oauth/authorize
   * Инициация OAuth flow
   */
  @Get('authorize')
  @Public()
  @ApiOperation({ summary: 'Инициация OAuth flow' })
  @ApiQuery({ name: 'client_id', required: true, description: 'ID клиента' })
  @ApiQuery({ name: 'redirect_uri', required: true, description: 'URL для редиректа после авторизации' })
  @ApiQuery({ name: 'response_type', required: true, description: 'Тип ответа (code)' })
  @ApiQuery({ name: 'scope', required: false, description: 'Разрешения (openid email profile)' })
  @ApiQuery({ name: 'state', required: false, description: 'CSRF защита' })
  @ApiResponse({ status: 302, description: 'Редирект на страницу авторизации или callback' })
  @ApiResponse({ status: 400, description: 'Неверные параметры' })
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string = 'openid email profile',
    @Query('state') state: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // ✅ ЛОГИРОВАНИЕ: Логируем все входящие данные для отладки
    console.log(`🔍 [OAuth] ========== AUTHORIZE REQUEST ==========`);
    console.log(`🔍 [OAuth] Query params:`, {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope: scope,
      state: state,
    });
    console.log(`🔍 [OAuth] Cookies:`, {
      oauth_flow_active: req.cookies?.oauth_flow_active,
      oauth_client_id: req.cookies?.oauth_client_id,
      oauth_redirect_uri: req.cookies?.oauth_redirect_uri,
      oauth_scope: req.cookies?.oauth_scope,
      oauth_state_param: req.cookies?.oauth_state_param,
      temp_access_token: req.cookies?.temp_access_token ? 'present' : 'missing',
    });
    console.log(`🔍 [OAuth] Request URL: ${req.url}`);
    console.log(`🔍 [OAuth] Request method: ${req.method}`);
    console.log(`🔍 [OAuth] Request headers:`, {
      referer: req.headers.referer,
      origin: req.headers.origin,
      cookie: req.headers.cookie ? 'present' : 'missing',
    });
    
    // ✅ ВОССТАНОВЛЕНИЕ ПАРАМЕТРОВ ИЗ COOKIES: Если параметры не переданы в query, берем из cookies
    // Это нужно для случая, когда пользователь авторизовался и редиректится на /oauth/authorize
    const finalClientId = clientId || req.cookies?.oauth_client_id;
    const finalRedirectUri = redirectUri || req.cookies?.oauth_redirect_uri;
    const finalScope = scope || req.cookies?.oauth_scope || 'openid email profile';
    const finalState = state || req.cookies?.oauth_state_param;
    const finalResponseType = responseType || 'code';
    
    console.log(`🔍 [OAuth] Final params after restoration:`, {
      client_id: finalClientId,
      redirect_uri: finalRedirectUri,
      scope: finalScope,
      state: finalState,
      response_type: finalResponseType,
    });

    // Валидация параметров
    if (!finalClientId || !finalRedirectUri || !finalResponseType) {
      throw new BadRequestException('Missing required parameters: client_id, redirect_uri, response_type');
    }

    if (finalResponseType !== 'code') {
      throw new BadRequestException('Only authorization_code flow is supported');
    }

    // Валидация клиента и redirect_uri
    console.log(`🔍 [OAuth] Starting redirect URI validation...`);
    const isValidRedirect = await this.oauthService.validateRedirectUri(finalClientId, finalRedirectUri);
    console.log(`🔍 [OAuth] Redirect URI validation result: ${isValidRedirect}`);
    if (!isValidRedirect) {
      console.error(`❌ [OAuth] Redirect URI validation FAILED!`);
      console.error(`❌ [OAuth] Client ID: ${finalClientId}`);
      console.error(`❌ [OAuth] Requested redirect URI: ${finalRedirectUri}`);
      throw new BadRequestException(`Invalid redirect_uri for this client. Requested: ${finalRedirectUri}`);
    }
    console.log(`✅ [OAuth] Redirect URI validation passed`);

    // Проверяем, авторизован ли пользователь
    // ✅ ПРОВЕРКА: Сначала проверяем temp_access_token из cookie (для GitHub/Telegram OAuth flow)
    let user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      isVerified: boolean;
      createdAt: Date;
    } | null = null;

    const tempToken = req.cookies?.temp_access_token;
    console.log(`🔍 [OAuth] Checking temp_access_token cookie: ${tempToken ? 'present' : 'missing'}`);
    if (tempToken) {
      try {
        user = await this.oauthService.getUserInfo(tempToken);
        console.log(`✅ [OAuth] User authenticated via temp_access_token: ${user?.email}`);
        // Очищаем временный токен из cookie
        res.clearCookie('temp_access_token');
      } catch (error) {
        console.error(`❌ [OAuth] Failed to authenticate via temp_access_token:`, error.message);
        // Токен невалиден, продолжаем проверку
      }
    }

    // Если temp_token не помог, проверяем Authorization header
    if (!user) {
      const authHeader = req.headers.authorization;
      console.log(`🔍 [OAuth] Checking Authorization header: ${authHeader ? 'present' : 'missing'}`);
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          user = await this.oauthService.getUserInfo(token);
          console.log(`✅ [OAuth] User authenticated via Authorization header: ${user?.email}`);
        } catch (error) {
          console.error(`❌ [OAuth] Failed to authenticate via Authorization header:`, error.message);
          // Токен невалиден, пользователь не авторизован
        }
      }
    }
    
    // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Проверяем, может быть пользователь уже авторизован через сессию
    // (если frontend передает токен через другой механизм)
    if (!user) {
      console.log(`🔍 [OAuth] No user found via temp_access_token or Authorization header`);
      console.log(`🔍 [OAuth] All cookies:`, Object.keys(req.cookies || {}));
      console.log(`🔍 [OAuth] All headers:`, Object.keys(req.headers).filter(k => k.toLowerCase().includes('auth') || k.toLowerCase().includes('cookie')));
    }
    
    // ✅ ПРОВЕРКА: Если пользователь не авторизован, но есть OAuth cookies,
    // значит это повторный запрос после авторизации - нужно сохранить параметры и редиректить на логин
    // Но если cookies уже есть, значит параметры уже сохранены, просто продолжаем

    // Если пользователь не авторизован, сохраняем параметры OAuth и редиректим на страницу авторизации
    console.log(`🔍 [OAuth] User authenticated: ${user ? 'yes' : 'no'}`);
    console.log(`🔍 [OAuth] OAuth cookies present:`, {
      oauth_flow_active: !!req.cookies?.oauth_flow_active,
      oauth_client_id: !!req.cookies?.oauth_client_id,
      oauth_redirect_uri: !!req.cookies?.oauth_redirect_uri,
    });
    if (!user) {
      // Сохраняем параметры OAuth в cookie для последующего использования (используем финальные значения)
      // ✅ УСТАНОВКА ФЛАГА OAuth FLOW: Устанавливаем специальный флаг, что это реальный OAuth flow
      res.cookie('oauth_flow_active', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000, // 10 минут
      });
      res.cookie('oauth_client_id', finalClientId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000, // 10 минут
      });
      res.cookie('oauth_redirect_uri', finalRedirectUri, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000,
      });
      res.cookie('oauth_scope', finalScope, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000,
      });
      if (finalState) {
        res.cookie('oauth_state_param', finalState, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600000,
        });
      }

      // Редиректим на страницу авторизации Loginus с параметрами OAuth flow
      const frontendUrl = process.env.FRONTEND_URL || 'https://vselena.ldmco.ru';
      const loginUrl = new URL(`${frontendUrl}/index.html`);
      loginUrl.searchParams.set('oauth_flow', 'true');
      // ✅ ВАЖНО: Сохраняем полный путь с /api/ для правильного редиректа на backend endpoint
      loginUrl.searchParams.set('return_to', '/api/oauth/authorize');
      if (finalClientId) {
        loginUrl.searchParams.set('client_id', finalClientId);
      }

      return res.redirect(loginUrl.toString());
    }

    // Пользователь авторизован - создаем authorization code
    // Используем финальные значения параметров (из query или cookies)
    console.log(`✅ [OAuth] User is authenticated, creating authorization code`);
    console.log(`🔍 [OAuth] Final params:`, {
      clientId: finalClientId,
      redirectUri: finalRedirectUri,
      scope: finalScope,
      state: finalState,
    });
    const scopes = finalScope ? finalScope.split(' ') : ['openid', 'email', 'profile'];
    const code = await this.oauthService.createAuthorizationCode(
      user.id,
      finalClientId,
      finalRedirectUri,
      scopes,
      finalState,
    );

    // Очищаем OAuth cookies после успешного создания code
    res.clearCookie('oauth_flow_active');
    res.clearCookie('oauth_client_id');
    res.clearCookie('oauth_redirect_uri');
    res.clearCookie('oauth_scope');
    res.clearCookie('oauth_state_param');

    // Редиректим на redirect_uri с code
    const redirectUrl = new URL(finalRedirectUri);
    redirectUrl.searchParams.set('code', code);
    if (finalState) {
      redirectUrl.searchParams.set('state', finalState);
    }

    // ✅ ЛОГИРОВАНИЕ: Логируем редирект для отладки
    console.log(`✅ [OAuth] User authorized, redirecting to AI Aggregator`);
    console.log(`✅ [OAuth] Redirect URI: ${finalRedirectUri}`);
    console.log(`✅ [OAuth] Full redirect URL: ${redirectUrl.toString()}`);
    console.log(`✅ [OAuth] Code: ${code.substring(0, 10)}...`);
    console.log(`✅ [OAuth] State: ${finalState || 'none'}`);

    return res.redirect(redirectUrl.toString());
  }

  /**
   * POST /oauth/token
   * Обмен authorization code на access token
   */
  @Post('token')
  @Public()
  @ApiOperation({ summary: 'Обмен authorization code на access token' })
  @ApiResponse({ status: 200, description: 'Токены выданы' })
  @ApiResponse({ status: 400, description: 'Неверный запрос' })
  async token(@Body() body: OAuthTokenDto) {
    const { grant_type, code, redirect_uri, client_id, client_secret } = body;

    if (!grant_type || grant_type !== 'authorization_code') {
      throw new BadRequestException('Only authorization_code grant_type is supported');
    }

    if (!code || !redirect_uri || !client_id || !client_secret) {
      throw new BadRequestException('Missing required parameters');
    }

    try {
      const tokens = await this.oauthService.exchangeCodeForToken(
        code,
        client_id,
        client_secret,
        redirect_uri,
      );

      return tokens;
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to exchange code for token');
    }
  }

  /**
   * GET /oauth/userinfo
   * Получение информации о пользователе
   */
  @Get('userinfo')
  @Public()
  @ApiOperation({ summary: 'Получение информации о пользователе' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Информация о пользователе' })
  @ApiResponse({ status: 401, description: 'Неавторизован' })
  async userinfo(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authorization.substring(7);
    try {
      const userInfo = await this.oauthService.getUserInfo(token);
      return userInfo;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * POST /oauth/logout
   * Выход из системы (опционально)
   */
  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Выход из системы OAuth' })
  @ApiResponse({ status: 200, description: 'Выход выполнен' })
  async logout(
    @Body() body: { token?: string; redirect_uri?: string },
    @Res() res: Response,
  ) {
    // В реальной реализации здесь можно инвалидировать токен
    // Для упрощения просто возвращаем успех

    if (body.redirect_uri) {
      return res.redirect(body.redirect_uri);
    }

    return res.json({ message: 'Logged out successfully' });
  }

  /**
   * POST /oauth/clients/register
   * Регистрация нового OAuth клиента (только для админов)
   */
  @Post('clients/register')
  @UseGuards(JwtAuthGuard)
  @RequireRoles('super_admin', 'admin')
  @ApiOperation({ summary: 'Регистрация нового OAuth клиента' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'OAuth клиент создан' })
  @ApiResponse({ status: 401, description: 'Неавторизован' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async registerClient(
    @Body() body: {
      name: string;
      redirect_uris: string[];
      scopes?: string[];
    },
  ) {
    if (!body.name || !body.redirect_uris || !Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
      throw new BadRequestException('Missing required parameters: name, redirect_uris');
    }

    const scopes = body.scopes || ['openid', 'email', 'profile'];
    const result = await this.oauthService.registerClient(
      body.name,
      body.redirect_uris,
      scopes,
    );

    return {
      client_id: result.clientId,
      client_secret: result.clientSecret,
      name: body.name,
      redirect_uris: body.redirect_uris,
      scopes: scopes,
    };
  }
}

