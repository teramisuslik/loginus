import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { UserRoleAssignment } from '../../users/entities/user-role-assignment.entity';
import { SettingsService } from '../../settings/settings.service';
import { AuthMethodType } from '../enums/auth-method-type.enum';
import { OAuthCallbackResult, OAuthMetadata } from '../interfaces/multi-auth.interface';

@Injectable()
export class GitHubAuthService {
  private readonly logger = new Logger(GitHubAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
    @InjectRepository(UserRoleAssignment)
    private userRoleAssignmentRepo: Repository<UserRoleAssignment>,
  ) {
    this.clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';
    // ✅ ИСПРАВЛЕНИЕ: Redirect URI должен указывать на frontend (github-login.html), а не на backend
    // Frontend обработает code и вызовет backend endpoint для обмена code на token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://loginus.startapus.com';
    this.redirectUri = this.configService.get<string>('GITHUB_REDIRECT_URI') || `${frontendUrl}/github-login.html`;
  }

  /**
   * Получение URL для авторизации через GitHub
   */
  getAuthUrl(state?: string, forceLogin: boolean = false): string {
    if (!this.clientId) {
      this.logger.error('❌ GitHub OAuth не настроен! Пожалуйста, создайте OAuth App на https://github.com/settings/developers');
      throw new Error('GitHub OAuth не настроен. Создайте OAuth приложение на https://github.com/settings/developers и добавьте GITHUB_CLIENT_ID в .env');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email',
      state: state || this.generateState(),
    });
    
    // Добавляем параметры для принудительного выбора аккаунта (только если forceLogin=true)
    if (forceLogin) {
      // Добавляем уникальный timestamp в state для обхода кеша GitHub
      const timestamp = Date.now();
      const currentState = params.get('state') || '';
      params.set('state', `${currentState}_${timestamp}_force`);
      
      // Параметр login с пустым значением может помочь показать экран выбора аккаунта
      // Но GitHub может игнорировать его, если пользователь уже авторизован
      // Более надежный способ - добавить случайный параметр для обхода кеша сессии
      params.append('login', '');
      // Добавляем случайный параметр для гарантированного обхода кеша
      params.append('_', Date.now().toString());
      
      this.logger.log(`🔐 Force login enabled - GitHub OAuth URL with forced account selection (state: ${params.get('state')}). Note: User may need to log out from GitHub first for this to work reliably.`);
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Обработка callback от GitHub
   */
  async handleCallback(
    code: string,
    state?: string,
    bind?: boolean,
    userId?: string,
  ): Promise<OAuthCallbackResult> {
    try {
      // Обмениваем код на access token
      const accessToken = await this.exchangeCodeForToken(code);
      
      // Получаем данные пользователя
      const userData = await this.getUserData(accessToken);
      
      // Получаем email пользователя
      const emailData = await this.getUserEmails(accessToken);
      
      // Формируем метаданные
      const metadata: OAuthMetadata = {
        provider: 'github',
        providerId: userData.id.toString(),
        username: userData.login,
        avatarUrl: userData.avatar_url,
        profileUrl: userData.html_url,
        accessToken,
        scopes: ['user:email'],
      };

      // If this is a binding request, we're attaching GitHub to an existing user
      if (bind && userId) {
        this.logger.log(`GitHub binding request for user ${userId}`);
        
        const currentUser = await this.usersRepo.findOne({ where: { id: userId } });
        
        if (!currentUser) {
          this.logger.error(`Current user ${userId} not found for binding`);
          throw new Error('User not found');
        }
        
        // Check if there's already a GitHub account with this ID
        const githubId = userData.id.toString();
        this.logger.log(`🔍 Checking for existing GitHub account with ID: ${githubId}`);
        const existingGitHubUser = await this.findUserByGitHubId(githubId);
        
        this.logger.log(`🔍 Existing GitHub user found: ${existingGitHubUser ? `ID=${existingGitHubUser.id}, email=${existingGitHubUser.email}` : 'none'}`);
        this.logger.log(`🔍 Current user ID: ${userId}`);
        this.logger.log(`🔍 Should merge: ${existingGitHubUser && existingGitHubUser.id !== userId ? 'YES' : 'NO'}`);
        this.logger.log(`🔍 Comparison: existingGitHubUser.id=${existingGitHubUser?.id}, userId=${userId}, equal=${existingGitHubUser?.id === userId}`);
        
        if (existingGitHubUser && existingGitHubUser.id !== userId) {
          // There's already a GitHub account - need to merge
          this.logger.log(`🔄 MERGING: Found existing GitHub account: ${existingGitHubUser.email}`);
          
          // Merge accounts by updating the CURRENT user with GitHub data and deleting the old GitHub account
          const mergedUser = await this.mergeAccounts(currentUser, existingGitHubUser, userData, emailData, metadata);
          
          return {
            success: true,
            user: mergedUser,
            message: 'Аккаунты успешно объединены'
          };
        }
        
        // Update current user with GitHub data
        currentUser.githubId = userData.id.toString();
        currentUser.githubUsername = userData.login;
        currentUser.githubVerified = true;
        if (userData.avatar_url && !currentUser.avatarUrl) {
          currentUser.avatarUrl = userData.avatar_url;
        }
        
        // Add GitHub to available methods if not already there
        if (!currentUser.availableAuthMethods.includes(AuthMethodType.GITHUB)) {
          currentUser.availableAuthMethods.push(AuthMethodType.GITHUB);
        }
        
        // Update OAuth metadata
        if (!currentUser.oauthMetadata) {
          currentUser.oauthMetadata = {};
        }
        currentUser.oauthMetadata.github = metadata;
        
        // Обновляем githubUsername при привязке GitHub
        const githubUsername = userData.login;
        if (!currentUser.githubUsername || currentUser.githubUsername !== githubUsername) {
          currentUser.githubUsername = githubUsername;
          this.logger.log(`✅ Updated GitHub username for user ${userId}: ${githubUsername}`);
        }
        
        const updatedUser = await this.usersRepo.save(currentUser);
        this.logger.log(`GitHub bound to user ${userId}, available methods: ${JSON.stringify(updatedUser.availableAuthMethods)}`);
        
        return {
          success: true,
          user: updatedUser,
        };
      }
      
      // Only check for existing users if this is NOT a binding request
      // Проверяем, есть ли пользователь с таким GitHub ID
      const existingUser = await this.findUserByGitHubId(userData.id.toString());
      this.logger.log(`GitHub user lookup by githubId=${userData.id.toString()}: ${existingUser ? 'found' : 'not found'}`);
      
      if (existingUser) {
        // Обновляем метаданные существующего пользователя
        await this.updateUserOAuthMetadata(existingUser.id, metadata);
        
        // Обновляем githubUsername, если он изменился или отсутствует
        const githubUsername = userData.login;
        if (!existingUser.githubUsername || existingUser.githubUsername !== githubUsername) {
          existingUser.githubUsername = githubUsername;
          await this.usersRepo.save(existingUser);
          this.logger.log(`✅ Updated GitHub username for user ${existingUser.email}: ${githubUsername}`);
        }
        
        this.logger.log(`Returning existing GitHub user: ${existingUser.email}`);
        return {
          success: true,
          user: existingUser,
        };
      }

      // ✅ ИСПРАВЛЕНИЕ: Не проверяем email при регистрации через GitHub
      // Пользователь должен иметь возможность создать отдельный аккаунт через GitHub,
      // даже если email уже используется другим аккаунтом
      // Связывание аккаунтов должно происходить только явно через привязку (bind)
      const primaryEmail = emailData.find(email => email.primary)?.email;
      this.logger.log(`Creating new GitHub account for email: ${primaryEmail} (ignoring existing email accounts)`);

      // Создаем нового пользователя
      this.logger.log(`Creating new GitHub user for email: ${primaryEmail}`);
      const newUser = await this.createUserFromGitHub(userData, emailData, metadata);
      this.logger.log(`New GitHub user created: ${newUser.id}`);
      
      // Назначаем роль новому пользователю
      await this.assignDefaultRoleToUser(newUser.id);
      
      return {
        success: true,
        user: newUser,
      };

    } catch (error) {
      this.logger.error(`Ошибка обработки GitHub callback: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      
      // ✅ ИСПРАВЛЕНИЕ: Более детальное логирование ошибок
      if (error.code === '23505' || error.message.includes('UNIQUE') || error.message.includes('duplicate')) {
        this.logger.error(`❌ Ошибка уникальности: email уже используется другим аккаунтом`);
        return {
          success: false,
          error: 'Email уже используется другим аккаунтом. Попробуйте привязать GitHub к существующему аккаунту.',
        };
      }
      
      return {
        success: false,
        error: `Ошибка авторизации через GitHub: ${error.message}`,
      };
    }
  }

  /**
   * Обновление access token
   */
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    // GitHub не предоставляет refresh token в стандартном OAuth 2.0 flow
    // Токены GitHub не истекают, но могут быть отозваны пользователем
    // Здесь можно реализовать проверку валидности токена
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${refreshToken}`,
        },
      });

      if (response.ok) {
        return refreshToken; // Токен все еще валиден
      } else {
        return null; // Токен недействителен
      }
    } catch (error) {
      this.logger.error(`Ошибка проверки GitHub токена: ${error.message}`);
      return null;
    }
  }

  /**
   * Отзыв access token
   */
  async revokeAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/applications/${this.clientId}/tokens/${accessToken}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`Ошибка отзыва GitHub токена: ${error.message}`);
      return false;
    }
  }

  // Приватные методы

  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`GitHub token exchange error: ${data.error_description}`);
    }

    return data.access_token;
  }

  private async getUserData(accessToken: string): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub user data: ${response.statusText}`);
    }

    return response.json();
  }

  private async getUserEmails(accessToken: string): Promise<any[]> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub user emails: ${response.statusText}`);
    }

    return response.json();
  }

  private async findUserByGitHubId(githubId: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { githubId },
    });
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email },
    });
  }

  private async updateUserOAuthMetadata(userId: string, metadata: OAuthMetadata): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.error(`User ${userId} not found for OAuth metadata update`);
      return;
    }
    
    if (!user.oauthMetadata) {
      user.oauthMetadata = {};
    }
    user.oauthMetadata.github = metadata;
    
    await this.usersRepo.save(user);
    this.logger.log(`✅ Обновлены GitHub метаданные для пользователя ${userId}, accessToken сохранен`);
  }

  private async createUserFromGitHub(
    userData: any,
    emailData: any[],
    metadata: OAuthMetadata,
  ): Promise<User> {
    // Здесь должна быть логика создания нового пользователя в БД
    const primaryEmail = emailData.find(email => email.primary)?.email;
    // Если primary email не найден, берем первый verified email
    let userEmail = primaryEmail || emailData.find(email => email.verified)?.email || `${userData.login}@github.local`;
    
    // ✅ ИСПРАВЛЕНИЕ: Проверяем, не используется ли email другим аккаунтом
    // Если используется, создаем псевдо-email для нового аккаунта
    const existingUserWithEmail = await this.findUserByEmail(userEmail);
    if (existingUserWithEmail && !userEmail.includes('@github.local') && !userEmail.includes('@telegram.local')) {
      this.logger.log(`⚠️ Email ${userEmail} уже используется аккаунтом ${existingUserWithEmail.id}, создаем псевдо-email для нового GitHub аккаунта`);
      // Создаем уникальный псевдо-email на основе GitHub username
      userEmail = `${userData.login}_${userData.id}@github.local`;
      this.logger.log(`✅ Используем псевдо-email: ${userEmail}`);
    }
    
    this.logger.log(`Creating GitHub user with email: ${userEmail} (primaryEmail: ${primaryEmail || 'not found'})`);
    
    const newUser = this.usersRepo.create({
      email: userEmail,
      passwordHash: null, // OAuth users don't have a password
      firstName: userData.name?.split(' ')[0] || userData.login,
      lastName: userData.name?.split(' ').slice(1).join(' ') || '',
      avatarUrl: userData.avatar_url,
      githubId: userData.id.toString(),
      githubUsername: userData.login,
      githubVerified: true,
      primaryAuthMethod: AuthMethodType.GITHUB,
      availableAuthMethods: [AuthMethodType.GITHUB],
      oauthMetadata: { github: metadata } as any,
      isActive: true,
      emailVerified: true,
    });

    try {
      const savedUser = await this.usersRepo.save(newUser);
      this.logger.log(`Создан новый пользователь через GitHub: ${savedUser?.email || 'unknown'}`);
      return savedUser;
    } catch (error) {
      // ✅ ИСПРАВЛЕНИЕ: Обрабатываем ошибку уникальности
      if (error.code === '23505' || error.message.includes('UNIQUE') || error.message.includes('duplicate')) {
        this.logger.error(`❌ Ошибка уникальности при создании пользователя: ${error.message}`);
        // Пробуем создать с другим email
        const fallbackEmail = `${userData.login}_${Date.now()}@github.local`;
        this.logger.log(`Пробуем создать пользователя с fallback email: ${fallbackEmail}`);
        newUser.email = fallbackEmail;
        const savedUser = await this.usersRepo.save(newUser);
        this.logger.log(`Создан новый пользователь через GitHub с fallback email: ${savedUser?.email}`);
        return savedUser;
      }
      throw error;
    }
  }

  private async assignDefaultRoleToUser(userId: string): Promise<void> {
    try {
      // Проверяем, есть ли уже пользователи в системе
      const userCount = await this.usersRepo.count();
      const isFirstUser = userCount === 1; // Только что создали пользователя, поэтому count = 1
      
      let roleToAssign;
      
      if (isFirstUser) {
        // Первый пользователь становится super_admin
        roleToAssign = await this.rolesRepo.findOne({
          where: { name: 'super_admin' }
        });
        this.logger.log('👑 Первый пользователь получает роль super_admin');
      } else {
        // Остальные пользователи получают роль из настроек системы
        const defaultRoleName = await this.settingsService.getDefaultUserRole();
        roleToAssign = await this.rolesRepo.findOne({
          where: { name: defaultRoleName }
        });
        this.logger.log(`👤 Новому пользователю назначена роль "${defaultRoleName}" (из настроек)`);
      }
      
      if (roleToAssign) {
        await this.userRoleAssignmentRepo.save({
          userId: userId,
          roleId: roleToAssign.id,
        });
        this.logger.log(`✅ Пользователю назначена роль "${roleToAssign.name}"`);
      } else {
        this.logger.log('⚠️ Роль не найдена');
      }
    } catch (error) {
      this.logger.error(`Ошибка назначения роли: ${error.message}`);
    }
  }

  private async detectConflicts(
    existingUser: any,
    githubUserData: any,
    emailData: any[],
  ): Promise<any> {
    const conflicts: any = {};

    const primaryEmail = emailData.find(email => email.primary)?.email;
    
    if (existingUser.email && existingUser.email !== primaryEmail) {
      conflicts.email = {
        primary: existingUser.email,
        secondary: primaryEmail,
      };
    }

    if (existingUser.firstName && existingUser.firstName !== githubUserData.name?.split(' ')[0]) {
      conflicts.firstName = {
        primary: existingUser.firstName,
        secondary: githubUserData.name?.split(' ')[0] || githubUserData.login,
      };
    }

    return conflicts;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Merge two user accounts
   */
  private async mergeAccounts(currentUser: any, githubUser: any, userData: any, emailData: any[], metadata: any): Promise<any> {
    this.logger.log(`🔄 MERGE START: Current(${currentUser.id}, ${currentUser.email}) + GitHub(${githubUser.id}, ${githubUser.email})`);
    this.logger.log(`🔄 Current user auth methods: ${JSON.stringify(currentUser.availableAuthMethods)}`);
    this.logger.log(`🔄 GitHub user auth methods: ${JSON.stringify(githubUser.availableAuthMethods)}`);
    
    // Merge available auth methods
    const mergedMethods = [...new Set([...currentUser.availableAuthMethods, ...githubUser.availableAuthMethods])];
    this.logger.log(`🔄 Merged auth methods: ${JSON.stringify(mergedMethods)}`);
    
    // Merge user data - prioritize current user's data, add GitHub data
    const mergedUser = {
      ...currentUser,
      // Add GitHub data
      githubId: userData.id.toString(),
      githubUsername: userData.login,
      githubVerified: true,
      avatarUrl: userData.avatar_url || currentUser.avatarUrl,
      // Merge auth methods
      availableAuthMethods: mergedMethods,
      // Merge OAuth metadata
      oauthMetadata: {
        ...currentUser.oauthMetadata,
        ...githubUser.oauthMetadata,
        github: metadata
      }
    };
    
    this.logger.log(`🔄 Saving merged user with ID: ${mergedUser.id}`);
    this.logger.log(`🔄 Merged user data: ${JSON.stringify(mergedUser, null, 2)}`);
    // Save merged user
    const savedUser = await this.usersRepo.save(mergedUser);
    
    this.logger.log(`🔄 Deleting old GitHub user with ID: ${githubUser.id}`);
    // Delete the old GitHub user account
    await this.usersRepo.remove(githubUser);
    
    this.logger.log(`✅ MERGE COMPLETE: New user ID=${savedUser.id}, email=${savedUser.email}`);
    
    return savedUser;
  }
}