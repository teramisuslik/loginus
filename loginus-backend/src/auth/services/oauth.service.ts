import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuthClient } from '../entities/oauth-client.entity';
import { AuthorizationCode } from '../entities/authorization-code.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthClient)
    private oauthClientRepo: Repository<OAuthClient>,
    @InjectRepository(AuthorizationCode)
    private authorizationCodeRepo: Repository<AuthorizationCode>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  /**
   * Валидация OAuth клиента
   */
  async validateClient(clientId: string, clientSecret?: string): Promise<OAuthClient> {
    const client = await this.oauthClientRepo.findOne({
      where: { clientId, isActive: true },
    });

    if (!client) {
      throw new NotFoundException('OAuth client not found');
    }

    if (clientSecret && client.clientSecret !== clientSecret) {
      throw new UnauthorizedException('Invalid client secret');
    }

    return client;
  }

  /**
   * Валидация redirect_uri для клиента
   */
  async validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.validateClient(clientId);
    return client.redirectUris.includes(redirectUri);
  }

  /**
   * Создание authorization code
   */
  async createAuthorizationCode(
    userId: string,
    clientId: string,
    redirectUri: string,
    scopes: string[],
    state?: string,
  ): Promise<string> {
    // Генерируем уникальный код
    const code = crypto.randomBytes(32).toString('hex');

    // Создаем запись в БД
    const authCode = this.authorizationCodeRepo.create({
      code,
      userId,
      clientId,
      redirectUri,
      scopes,
      state,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 минут
    });

    await this.authorizationCodeRepo.save(authCode);
    return code;
  }

  /**
   * Обмен authorization code на access token
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    id_token?: string;
  }> {
    // Валидируем клиента
    await this.validateClient(clientId, clientSecret);

    // Находим authorization code
    const authCode = await this.authorizationCodeRepo.findOne({
      where: {
        code,
        clientId,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!authCode) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    // Проверяем redirect_uri
    if (authCode.redirectUri !== redirectUri) {
      throw new BadRequestException('Redirect URI mismatch');
    }

    // Помечаем код как использованный
    authCode.isUsed = true;
    await this.authorizationCodeRepo.save(authCode);

    // Получаем пользователя
    const user = await this.usersService.findById(authCode.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Генерируем access token
    const jwtSecret = this.configService.get<string>('jwt.secret') || 'default-secret';
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        scopes: authCode.scopes,
        clientId,
      },
      {
        secret: jwtSecret,
        expiresIn: '1h',
      },
    );

    // Генерируем refresh token (опционально)
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Генерируем id_token (JWT с информацией о пользователе)
    const idToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
      {
        secret: jwtSecret,
        expiresIn: '1h',
      },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      id_token: idToken,
    };
  }

  /**
   * Получение информации о пользователе по access token
   */
  async getUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isVerified: boolean;
    createdAt: Date;
    oauthMetadata?: any;
    messengerMetadata?: any;
  }> {
    try {
      const jwtSecret = this.configService.get<string>('jwt.secret') || 'default-secret';
      const payload = this.jwtService.verify(accessToken, { secret: jwtSecret });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || undefined,
        isVerified: user.emailVerified && user.phoneVerified,
        createdAt: user.createdAt,
        oauthMetadata: user.oauthMetadata || null,
        messengerMetadata: user.messengerMetadata || null,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Регистрация нового OAuth клиента
   */
  async registerClient(
    name: string,
    redirectUris: string[],
    scopes: string[] = ['openid', 'email', 'profile'],
  ): Promise<{ clientId: string; clientSecret: string }> {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');

    const client = this.oauthClientRepo.create({
      clientId,
      clientSecret,
      name,
      redirectUris,
      scopes,
      isActive: true,
    });

    await this.oauthClientRepo.save(client);

    return { clientId, clientSecret };
  }

  /**
   * Валидация scopes
   */
  validateScopes(requestedScopes: string[], allowedScopes: string[]): string[] {
    return requestedScopes.filter((scope) => allowedScopes.includes(scope));
  }
}

