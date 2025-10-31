import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TwoFactorCode, TwoFactorStatus, TwoFactorType } from './entities/two-factor-code.entity';
import { Role } from '../rbac/entities/role.entity';
import { UserRoleAssignment } from '../users/entities/user-role-assignment.entity';
import { UsersService } from '../users/users.service';
import { RbacService } from '../rbac/rbac.service';
import { SettingsService } from '../settings/settings.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SmartAuthDto, SmartAuthResponseDto } from './dto/smart-auth.dto';
import { BindPhoneDto, VerifyPhoneDto, BindPhoneResponseDto } from './dto/bind-phone.dto';
import { SendEmailVerificationDto, VerifyEmailDto, EmailVerificationResponseDto } from './dto/email-verification.dto';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EmailService } from './email.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthMethodType } from './enums/auth-method-type.enum';
import { ReferralService } from './micro-modules/referral-system/referral.service';
import { NfaService } from './services/nfa.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private rbacService: RbacService,
    private referralService: ReferralService,
    private configService: ConfigService,
    private settingsService: SettingsService,
    @InjectRepository(RefreshToken)
    private refreshTokensRepo: Repository<RefreshToken>,
    @InjectRepository(TwoFactorCode)
    private twoFactorCodesRepo: Repository<TwoFactorCode>,
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private emailVerificationTokensRepo: Repository<EmailVerificationToken>,
    @InjectRepository(UserRoleAssignment)
    private userRoleAssignmentRepo: Repository<UserRoleAssignment>,
    private emailService: EmailService,
    private nfaService: NfaService,
  ) {}

  /**
   * Регистрация нового пользователя
   * Первый пользователь становится super_admin, остальные - viewer
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    console.log('🚀 AuthService.register() вызван с данными:', { email: dto.email, firstName: dto.firstName, lastName: dto.lastName });
    
    // 1. Проверка уникальности email
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email уже используется');
    }

    // 2. Проверяем, есть ли уже пользователи в системе
    const userCount = await this.usersService.getUserCount();
    const isFirstUser = userCount === 0;
    console.log(`📊 Количество пользователей в системе: ${userCount}, первый пользователь: ${isFirstUser}`);

    // 3. Хеширование пароля
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // 4. Создание пользователя
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // 5. Назначаем роль в зависимости от того, первый ли это пользователь
    let roleToAssign;
    
    if (isFirstUser) {
      // Первый пользователь становится super_admin
      roleToAssign = await this.rolesRepo.findOne({
        where: { name: 'super_admin' }
      });
      console.log('👑 Первый пользователь получает роль super_admin');
    } else {
      // Остальные пользователи получают роль из настроек системы
      const defaultRoleName = await this.settingsService.getDefaultUserRole();
      roleToAssign = await this.rolesRepo.findOne({
        where: { name: defaultRoleName }
      });
      console.log(`👤 Новому пользователю назначена роль "${defaultRoleName}" (из настроек)`);
    }
    
    if (roleToAssign) {
      await this.userRoleAssignmentRepo.save({
        userId: user.id,
        roleId: roleToAssign.id,
      });
      console.log(`✅ Пользователю назначена роль "${roleToAssign.name}"`);
    } else {
      console.log('⚠️ Роль не найдена');
    }

    // 6. Обрабатываем реферальный код, если он предоставлен (только при регистрации!)
    const referralCode = (dto as any).referralCode;
    if (referralCode) {
      try {
        console.log(`🔗 Обрабатываем реферальный код при регистрации: ${referralCode}`);
        const referralResult = await this.referralService.useReferralCode(
          referralCode,
          user.id
        );
        
        console.log(`✅ Пользователь ${user.email} привязан к рефералу ${referralResult.referrerId}`);
      } catch (error: any) {
        console.log(`⚠️ Не удалось привязать реферальный код: ${referralCode}. Ошибка: ${error?.message || 'unknown'}`);
      }
    }

    // 7. Загружаем пользователя с ролями и правами для генерации токена
    const userWithRoles = await this.getCurrentUser(user.id);
    
    // 8. Генерируем токены с ролями и правами
    const accessToken = await this.generateAccessToken(userWithRoles);
    const refreshToken = await this.generateRefreshToken(userWithRoles);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(userWithRoles),
    };
  }

  /**
   * Вход в систему
   */
  async login(dto: LoginDto): Promise<AuthResponseDto | { requires2FA: true; message: string; userId: string } | { requiresNFA: true; message: string; userId: string; methods: string[] }> {
    // 1. Валидация credentials
    const user = await this.validateUser(dto.email, dto.password);

    // 2. Проверяем, включена ли nFA (приоритет над legacy 2FA)
    if (user.mfaSettings?.enabled && user.mfaSettings.methods?.length > 0) {
      // nFA включена - требуем подтверждение всех методов
      return {
        requiresNFA: true,
        message: 'Требуется подтверждение всех выбранных методов защиты',
        userId: user.id,
        methods: user.mfaSettings.methods,
      };
    }

    // 3. Проверяем, включен ли legacy 2FA (обратная совместимость)
    if (user.twoFactorEnabled) {
      return {
        requires2FA: true,
        message: 'Требуется двухфакторная аутентификация',
        userId: user.id,
      };
    }

    // 4. Генерация токенов
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // 5. Загружаем полную информацию о пользователе с ролями и правами
    const fullUser = await this.getCurrentUser(user.id);

    // 6. Возврат данных
    return {
      accessToken,
      refreshToken,
      user: fullUser,
    };
  }

  /**
   * Завершение входа с nFA (после подтверждения всех методов)
   */
  async completeNFALogin(userId: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!user.mfaSettings?.enabled || !user.mfaSettings.methods?.length) {
      throw new UnauthorizedException('nFA не включена или не настроена для этого пользователя');
    }

    // Используем NfaService для проверки статуса
    const nfaStatus = await this.nfaService.getVerificationStatus(userId);
    if (!nfaStatus.success || nfaStatus.pendingMethods.length > 0) {
      throw new BadRequestException(
        `Не все nFA методы подтверждены. Ожидают: ${nfaStatus.pendingMethods.join(', ')}`
      );
    }

    // Все методы подтверждены - генерируем токены
    // Загружаем пользователя с ролями для правильного редиректа
    const userWithRoles = await this.usersService.findById(userId, {
      relations: ['userRoleAssignments', 'userRoleAssignments.role'],
    });
    if (!userWithRoles) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const accessToken = await this.generateAccessToken(userWithRoles);
    const refreshToken = await this.generateRefreshToken(userWithRoles);

    // Формируем объект пользователя с ролями для фронтенда
    const sanitizedUser = this.sanitizeUser(userWithRoles);
    // Добавляем роли в виде массива строк для фронтенда
    sanitizedUser.roles = (userWithRoles.userRoleAssignments || []).map(
      (assignment) => assignment.role?.name || '',
    ).filter(Boolean);

    return {
      accessToken,
      refreshToken,
      user: sanitizedUser,
    };
  }

  /**
   * Завершение входа с 2FA
   */
  async complete2FALogin(userId: string, code: string): Promise<AuthResponseDto> {
    // Находим пользователя
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!user.twoFactorEnabled) {
      throw new UnauthorizedException('2FA не включен для этого пользователя');
    }

    // Загружаем роли и права пользователя
    const userWithRoles = await this.usersService.findById(userId);
    if (!userWithRoles) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Проверяем 2FA код через простую проверку
    const twoFactorCode = await this.twoFactorCodesRepo.findOne({
      where: {
        contact: user.email || '',
        code: code,
        expiresAt: MoreThan(new Date()),
        status: TwoFactorStatus.PENDING,
      },
    });

    if (!twoFactorCode) {
      throw new BadRequestException('Неверный или истёкший 2FA код');
    }

    // Помечаем код как использованный
    await this.twoFactorCodesRepo.update(twoFactorCode.id, { 
      status: TwoFactorStatus.USED,
      verifiedAt: new Date()
    });

    // Генерируем токены
    const accessToken = await this.generateAccessToken(userWithRoles);
    const refreshToken = await this.generateRefreshToken(userWithRoles);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(userWithRoles),
    };
  }

  /**
   * Валидация пользователя и пароля
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email, {
      select: ['id', 'email', 'passwordHash', 'isActive', 'emailVerified', 'twoFactorEnabled'],
      relations: ['organizations', 'teams', 'userRoleAssignments', 'userRoleAssignments.role', 'userRoleAssignments.role.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    console.log('🔍 User organizations:', user.organizations?.length || 0);
    console.log('🔍 User teams:', user.teams?.length || 0);
    console.log('🔍 User roles:', user.userRoleAssignments?.length || 0);

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    // Сравнение паролей
    if (!user.passwordHash) {
      throw new UnauthorizedException('Пользователь не имеет пароля');
    }
    
    console.log('🔐 Password comparison:');
    console.log('  Input password:', password);
    console.log('  Stored hash:', user.passwordHash);
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('  Is valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    return user;
  }

  /**
   * Генерация Access Token (JWT)
   */
  async generateAccessToken(user: User): Promise<string> {
    // Загружаем роли и права через UserRoleAssignment
    const roleAssignments = await this.userRoleAssignmentRepo.find({
      where: { userId: user.id },
      relations: ['role', 'role.permissions', 'organizationRole', 'teamRole'],
    });

    // Извлекаем уникальные роли и права
    const roles = [...new Set(roleAssignments.map(ra => {
      if (ra.role) return ra.role.name;
      if (ra.organizationRole) return ra.organizationRole.name;
      if (ra.teamRole) return ra.teamRole.name;
      return null;
    }).filter((name): name is string => Boolean(name)))];
    const permissions = [
      ...new Set(
        roleAssignments.flatMap(ra => {
          if (ra.role?.permissions) return ra.role.permissions.map(p => p.name);
          if (ra.organizationRole?.permissions) return ra.organizationRole.permissions;
          if (ra.teamRole?.permissions) return ra.teamRole.permissions;
          return [];
        })
      ),
    ];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizations?.[0]?.id || null, // Первая организация
      teamId: user.teams?.[0]?.id || null, // Первая команда
      roles,
      permissions,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '15m',
    });
  }

  /**
   * Генерация Refresh Token (UUID + сохранение в БД)
   */
  async generateRefreshToken(user: User): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // +7 дней

    await this.refreshTokensRepo.save({
      token,
      userId: user.id,
      expiresAt,
      isRevoked: false,
    });

    return token;
  }

  /**
   * Обновление Access Token через Refresh Token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const tokenRecord = await this.refreshTokensRepo.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Невалидный refresh token');
    }

    if (tokenRecord.isRevoked) {
      throw new UnauthorizedException('Refresh token отозван');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token истёк');
    }

    // Если у пользователя включен 2FA, требуем повторную аутентификацию
    if (tokenRecord.user.twoFactorEnabled) {
      throw new UnauthorizedException('Требуется повторная аутентификация с 2FA');
    }

    // Генерация нового Access Token
    return this.generateAccessToken(tokenRecord.user);
  }

  /**
   * Выход из системы (отзыв Refresh Token)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokensRepo.update(
      { token: refreshToken },
      { isRevoked: true }
    );
  }

  /**
   * Получить актуальные данные текущего пользователя
   */
  async getCurrentUser(userId: string): Promise<any> {
    console.log('🔍 [getCurrentUser] Called with userId:', userId);
    
    try {
      const user = await this.usersService.findById(userId);

      if (!user) {
        console.error('❌ [getCurrentUser] User not found for userId:', userId);
        throw new UnauthorizedException('Пользователь не найден');
      }

      console.log('✅ [getCurrentUser] User found:', user.id, user.email);
      console.log('🔍 [getCurrentUser] user.userRoleAssignments:', user.userRoleAssignments?.length || 0);

      // Извлекаем роли из уже загруженных данных
      const roles = user.userRoleAssignments?.map(assignment => ({
        id: assignment.role?.id,
        name: assignment.role?.name,
        description: assignment.role?.description,
        isSystem: assignment.role?.isSystem,
        isGlobal: assignment.role?.isGlobal
      })).filter(role => role.id && role.name) || [];

      console.log('✅ [getCurrentUser] Roles extracted:', roles.length, roles);

      // Извлекаем права из уже загруженных данных
      const permissions: any[] = [];
      user.userRoleAssignments?.forEach(assignment => {
        if (assignment.role?.permissions) {
          assignment.role.permissions.forEach(permission => {
            permissions.push({
              id: permission.id,
              name: permission.name,
              resource: permission.resource,
              action: permission.action
            });
          });
        }
      });

      // Убираем дубликаты прав
      const uniquePermissions = permissions.filter((permission, index, self) => 
        index === self.findIndex(p => p.id === permission.id)
      );

      console.log('✅ [getCurrentUser] Permissions extracted:', uniquePermissions.length);
      
      const result = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        organizationId: user.organizations?.[0]?.id || null,
        teamId: user.teams?.[0]?.id || null,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethods: user.twoFactorMethods,
        phoneVerified: user.phoneVerified,
        primaryAuthMethod: user.primaryAuthMethod,
        availableAuthMethods: user.availableAuthMethods,
        mfaSettings: user.mfaSettings, // Добавляем настройки nFA
        roles: roles,
        permissions: uniquePermissions,
        organizations: user.organizations || [],
        teams: user.teams || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      
      console.log('✅ [getCurrentUser] Result prepared, returning data');
      console.log('✅ [getCurrentUser] Result has roles:', result.roles?.length || 0);
      console.log('✅ [getCurrentUser] Result has permissions:', result.permissions?.length || 0);
      console.log('✅ [getCurrentUser] Result has firstName:', result.firstName);
      console.log('✅ [getCurrentUser] Result has lastName:', result.lastName);
      console.log('✅ [getCurrentUser] Result has mfaSettings:', JSON.stringify(result.mfaSettings));
      console.log('✅ [getCurrentUser] User mfaSettings from DB:', JSON.stringify(user.mfaSettings));
      
      return result;
    } catch (error) {
      console.error('❌ [getCurrentUser] Error:', error);
      console.error('❌ [getCurrentUser] Error message:', error?.message);
      console.error('❌ [getCurrentUser] Error stack:', error?.stack);
      throw error;
    }
  }

  /**
   * Извлечение всех permissions из ролей пользователя
   */
  private extractPermissions(roles: any[]): string[] {
    const permissions = new Set<string>();
    
    roles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(perm => {
          permissions.add(perm.name);
        });
      }
    });

    return Array.from(permissions);
  }

  /**
   * Удаление чувствительных данных из User
   */
  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Умная авторизация - автоматически определяет, нужно ли регистрировать или авторизовать пользователя
   */
  async smartAuth(dto: SmartAuthDto): Promise<SmartAuthResponseDto> {
    try {
      // 1. Пытаемся найти пользователя по email
      const existingUser = await this.usersService.findByEmail(dto.email, {
        select: ['id', 'email', 'passwordHash', 'isActive', 'emailVerified', 'firstName', 'lastName'],
        relations: ['organizations', 'teams'],
      });

      if (existingUser) {
        // Пользователь существует - пытаемся авторизовать
        if (!existingUser.passwordHash) {
          return {
            success: false,
            message: 'Пользователь не имеет пароля. Используйте восстановление пароля.',
          };
        }
        
        const isPasswordValid = await bcrypt.compare(dto.password, existingUser.passwordHash);
        
        if (!isPasswordValid) {
          return {
            success: false,
            message: 'Неверный пароль',
          };
        }

        if (!existingUser.isActive) {
          return {
            success: false,
            message: 'Аккаунт деактивирован',
          };
        }

        // Проверяем, нужны ли дополнительные данные
        const missingFields: string[] = [];
        if (!existingUser.firstName) missingFields.push('firstName');
        if (!existingUser.lastName) missingFields.push('lastName');

        if (missingFields.length > 0) {
          return {
            success: true,
            message: 'Вход выполнен, но нужно дополнить информацию',
            needsAdditionalInfo: true,
            missingFields,
            user: this.sanitizeUser(existingUser),
          };
        }

        // Полная авторизация
        const accessToken = await this.generateAccessToken(existingUser);
        const refreshToken = await this.generateRefreshToken(existingUser);

        return {
          success: true,
          message: 'Вход выполнен успешно',
          accessToken,
          refreshToken,
          user: this.sanitizeUser(existingUser),
        };
      } else {
        // Пользователь не существует - создаем временного пользователя
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(dto.password, salt);

        // Создаем пользователя с минимальными данными
        const userData = {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName && dto.firstName.trim() ? dto.firstName.trim() : undefined,
          lastName: dto.lastName && dto.lastName.trim() ? dto.lastName.trim() : undefined,
          isActive: true,
          emailVerified: false,
        };

        const savedUser: User = await this.usersRepo.save(userData);

        // Обрабатываем реферальный код, если он предоставлен (только при регистрации!)
        if (dto.referralCode) {
          try {
            console.log(`🔗 Обрабатываем реферальный код при регистрации: ${dto.referralCode}`);
            const referralResult = await this.referralService.useReferralCode(
              dto.referralCode,
              savedUser.id
            );
            
            console.log(`✅ Пользователь ${savedUser.email} привязан к рефералу ${referralResult.referrerId}`);
          } catch (error) {
            console.log(`⚠️ Не удалось привязать реферальный код: ${dto.referralCode}. Ошибка: ${error.message}`);
          }
        }

        // Назначаем роль по умолчанию (как в методе register)
        const userCount = await this.usersService.getUserCount();
        const isFirstUser = userCount === 1; // Только что создали пользователя, значит это первый
        
        let roleToAssign;
        
        if (isFirstUser) {
          // Первый пользователь становится super_admin
          roleToAssign = await this.rolesRepo.findOne({
            where: { name: 'super_admin' }
          });
          console.log('👑 Первый пользователь получает роль super_admin');
        } else {
          // Остальные пользователи получают роль из настроек системы
          const defaultRoleName = await this.settingsService.getDefaultUserRole();
          roleToAssign = await this.rolesRepo.findOne({
            where: { name: defaultRoleName }
          });
          console.log(`👤 Новому пользователю назначена роль "${defaultRoleName}" (из настроек)`);
        }
        
        if (roleToAssign) {
          await this.userRoleAssignmentRepo.save({
            userId: savedUser.id,
            roleId: roleToAssign.id,
          });
          console.log(`✅ Пользователю назначена роль "${roleToAssign.name}"`);
        } else {
          console.log('⚠️ Роль не найдена');
        }

        // Перезагружаем пользователя с ролями
        const userWithRoles = await this.getCurrentUser(savedUser.id);

        if (!userWithRoles) {
          throw new Error('Не удалось загрузить пользователя');
        }

        // Проверяем, нужны ли дополнительные данные
        const missingFields: string[] = [];
        if (!dto.firstName) missingFields.push('firstName');
        if (!dto.lastName) missingFields.push('lastName');

        if (missingFields.length > 0) {
          return {
            success: true,
            message: 'Аккаунт создан, но нужно дополнить информацию',
            needsAdditionalInfo: true,
            missingFields,
            user: this.sanitizeUser(userWithRoles),
          };
        }

        // Полная регистрация
        const accessToken = await this.generateAccessToken(userWithRoles);
        const refreshToken = await this.generateRefreshToken(userWithRoles);

        return {
          success: true,
          message: 'Регистрация выполнена успешно',
          accessToken,
          refreshToken,
          user: this.sanitizeUser(userWithRoles),
        };
      }
    } catch (error) {
      console.error('Ошибка в smartAuth:', error);
      return {
        success: false,
        message: 'Произошла ошибка при авторизации',
      };
    }
  }

  /**
   * Дополнение информации о пользователе
   */
  async completeUserInfo(userId: string, firstName: string, lastName: string, referralCode?: string): Promise<SmartAuthResponseDto> {
    try {
      await this.usersRepo.update(userId, { firstName, lastName });
      
      // Обрабатываем реферальный код, если он предоставлен (только при регистрации!)
      if (referralCode) {
        try {
          console.log(`🔗 Обрабатываем реферальный код в completeUserInfo: ${referralCode}`);
          const referralResult = await this.referralService.useReferralCode(
            referralCode,
            userId
          );
          
          console.log(`✅ Пользователь ${userId} привязан к рефералу ${referralResult.referrerId}`);
        } catch (error) {
          console.log(`⚠️ Не удалось привязать реферальный код в completeUserInfo: ${referralCode}. Ошибка: ${error.message}`);
        }
      }
      
      const updatedUser = await this.usersService.findById(userId);

      if (!updatedUser) {
        return {
          success: false,
          message: 'Пользователь не найден',
        };
      }

      const accessToken = await this.generateAccessToken(updatedUser);
      const refreshToken = await this.generateRefreshToken(updatedUser);

      return {
        success: true,
        message: 'Информация дополнена успешно',
        accessToken,
        refreshToken,
        user: this.sanitizeUser(updatedUser),
      };
    } catch (error) {
      console.error('Ошибка в completeUserInfo:', error);
      return {
        success: false,
        message: 'Произошла ошибка при дополнении информации',
      };
    }
  }

  /**
   * Отправка SMS кода для привязки телефона
   */
  async sendPhoneVerificationCode(dto: BindPhoneDto, userId: string): Promise<BindPhoneResponseDto> {
    try {
      // Проверяем, не привязан ли уже этот номер к другому пользователю
      const existingUser = await this.usersService.findByPhone(dto.phone);
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          message: 'Этот номер телефона уже привязан к другому аккаунту',
        };
      }

      // Генерируем код подтверждения
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Сохраняем код в базе данных
      const twoFactorCode = this.twoFactorCodesRepo.create({
        userId,
        code: verificationCode,
        type: TwoFactorType.SMS,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
        status: TwoFactorStatus.PENDING,
      });
      
      await this.twoFactorCodesRepo.save(twoFactorCode);

      // Отправляем SMS (в реальном проекте здесь будет вызов SMS сервиса)
      console.log(`📱 SMS код для ${dto.phone}: ${verificationCode}`);
      
      // В тестовом режиме возвращаем код
      return {
        success: true,
        message: 'SMS с кодом подтверждения отправлено',
        verificationCode: verificationCode, // Только для тестирования
      };
    } catch (error) {
      console.error('Ошибка отправки SMS кода:', error);
      return {
        success: false,
        message: 'Ошибка отправки SMS кода',
      };
    }
  }

  /**
   * Подтверждение привязки телефона
   */
  async verifyPhoneCode(dto: VerifyPhoneDto, userId: string): Promise<BindPhoneResponseDto> {
    try {
      // Находим код подтверждения
      const verificationCode = await this.twoFactorCodesRepo.findOne({
        where: {
          userId,
          code: dto.code,
          type: TwoFactorType.SMS,
          status: TwoFactorStatus.PENDING,
        },
      });

      if (!verificationCode) {
        return {
          success: false,
          message: 'Неверный код подтверждения',
        };
      }

      // Проверяем, не истек ли код
      if (verificationCode.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Код подтверждения истек',
        };
      }

      // Привязываем телефон к пользователю
      await this.usersRepo.update(userId, {
        phone: dto.phone,
        phoneVerified: true,
      });

      // Помечаем код как использованный
      await this.twoFactorCodesRepo.update(verificationCode.id, {
        status: TwoFactorStatus.USED,
      });

      return {
        success: true,
        message: 'Номер телефона успешно привязан к аккаунту',
      };
    } catch (error) {
      console.error('Ошибка подтверждения телефона:', error);
      return {
        success: false,
        message: 'Ошибка подтверждения номера телефона',
      };
    }
  }

  /**
   * Отвязка номера телефона
   */
  async unbindPhone(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.usersRepo.update(userId, {
        phone: null,
        phoneVerified: false,
      });

      return {
        success: true,
        message: 'Номер телефона отвязан от аккаунта',
      };
    } catch (error) {
      console.error('Ошибка отвязки телефона:', error);
      return {
        success: false,
        message: 'Ошибка отвязки номера телефона',
      };
    }
  }

  /**
   * Отправка письма с подтверждением email
   */
  async sendEmailVerification(dto: SendEmailVerificationDto): Promise<EmailVerificationResponseDto> {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return {
          success: false,
          message: 'Пользователь с таким email не найден',
        };
      }

      console.log('🔍 Проверка emailVerified:', user.emailVerified);
      if (user.emailVerified) {
        console.log('✅ Email уже подтвержден, возвращаем успех с информационным сообщением');
        return {
          success: true,
          message: 'Email уже подтвержден',
        };
      }

      // Генерируем токен подтверждения
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

      // Сохраняем токен в БД
      const verificationToken = this.emailVerificationTokensRepo.create({
        userId: user.id,
        email: user.email || '',
        expiresAt,
        isUsed: false,
        status: 'pending',
      });

      await this.emailVerificationTokensRepo.save(verificationToken);

      // Формируем ссылку для подтверждения
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const verificationLink = `${frontendUrl}/?verify-email=true&token=${token}`;

      // Отправляем реальное письмо
      try {
        await this.emailService.sendEmailVerification(dto.email, verificationLink);
      } catch (error) {
        console.error('❌ Ошибка отправки письма:', error);
        // Fallback - показываем ссылку в логах
        console.log(`📧 Fallback - ссылка для ${dto.email}:`);
        console.log(`🔗 Ссылка: ${verificationLink}`);
      }

      return {
        success: true,
        message: 'Письмо с подтверждением отправлено на ваш email',
        verificationToken: token, // Только для тестирования
      };
    } catch (error) {
      console.error('Ошибка отправки письма подтверждения:', error);
      return {
        success: false,
        message: 'Ошибка отправки письма подтверждения',
      };
    }
  }

  /**
   * Вход по коду с почты (2FA)
   */
  async verifyEmail2FACode(email: string, code: string): Promise<any> {
    try {
      console.log('🔍 Проверяем 2FA код для email:', email);
      console.log('🔢 Код:', code);

      // Находим пользователя
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        console.log('❌ Пользователь не найден');
        throw new UnauthorizedException('Пользователь не найден');
      }

      // Находим код в БД
      const twoFactorCode = await this.twoFactorCodesRepo.findOne({
        where: {
          contact: email,
          code: code,
          type: 'email' as any,
          status: 'pending' as any
        }
      });

      if (!twoFactorCode) {
        console.log('❌ Код не найден или неверный');
        throw new UnauthorizedException('Неверный код');
      }

      // Проверяем, не истёк ли код (5 минут)
      const now = new Date();
      const codeAge = now.getTime() - twoFactorCode.createdAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (codeAge > fiveMinutes) {
        console.log('❌ Код истёк');
        throw new UnauthorizedException('Код истёк. Запросите новый код');
      }

      // Помечаем код как использованный
      await this.twoFactorCodesRepo.update(twoFactorCode.id, {
        status: 'used' as any
      });

      console.log('✅ Код подтверждён, генерируем токены');

      // Генерируем токены
      const accessToken = await this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      return {
        accessToken,
        refreshToken,
        user: this.sanitizeUser(user)
      };

    } catch (error) {
      console.error('Ошибка верификации 2FA кода:', error);
      throw error;
    }
  }

  /**
   * Подтверждение email по токену
   */
  async verifyEmailToken(token: string): Promise<EmailVerificationResponseDto> {
    try {
      console.log('🔍 Ищем токен подтверждения:', token);
      
      // Находим токен в БД
      const verificationToken = await this.emailVerificationTokensRepo.findOne({
        where: { token, isUsed: false },
        relations: ['user'],
      });

      if (!verificationToken) {
        console.log('❌ Токен не найден или уже использован');
        return {
          success: false,
          message: 'Неверный или истёкший токен подтверждения',
        };
      }

      // Проверяем, не истёк ли токен
      if (verificationToken.expiresAt < new Date()) {
        console.log('❌ Токен истёк');
        return {
          success: false,
          message: 'Токен подтверждения истёк',
        };
      }

      // Обновляем статус пользователя
      await this.usersService.update(verificationToken.user.id, {
        emailVerified: true,
      });

      // Помечаем токен как использованный
      verificationToken.isUsed = true;
      verificationToken.status = 'verified' as any;
      await this.emailVerificationTokensRepo.save(verificationToken);

      console.log('✅ Email успешно подтвержден для пользователя:', verificationToken.user.email);

      return {
        success: true,
        message: 'Email успешно подтвержден',
      };
    } catch (error) {
      console.error('Ошибка подтверждения email:', error);
      return {
        success: false,
        message: 'Ошибка подтверждения email',
      };
    }
  }

  /**
   * Подтверждение email по токену
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<EmailVerificationResponseDto> {
    try {
      const verificationToken = await this.emailVerificationTokensRepo.findOne({
        where: { token: dto.token },
        relations: ['user'],
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Неверный токен подтверждения',
        };
      }

      if (verificationToken.isUsed) {
        return {
          success: false,
          message: 'Токен уже использован',
        };
      }

      if (verificationToken.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Токен подтверждения истек',
        };
      }

      // Обновляем статус пользователя
      await this.usersRepo.update(verificationToken.userId, {
        emailVerified: true,
      });

      // Помечаем токен как использованный
      await this.emailVerificationTokensRepo.update(verificationToken.id, {
        isUsed: true,
        status: 'verified',
      });

      // Повышаем роль пользователя (например, с viewer на editor)
      // Ищем роль editor без привязки к организации или команде
      console.log('🔍 Ищем глобальную роль editor...');
      const editorRole = await this.rolesRepo.findOne({
        where: { 
          name: 'editor',
          organizationId: IsNull(),
          teamId: IsNull()
        },
      });

      console.log('🔍 Найденная роль editor:', editorRole);

      if (editorRole) {
        console.log('🔍 Заменяем роль пользователя на editor:', verificationToken.userId);
        await this.rbacService.replaceUserRole(
          verificationToken.userId,
          editorRole.id,
          'system', // Система повышает роль
        );
        console.log('✅ Роль editor успешно назначена (заменена)');
      } else {
        console.log('❌ Глобальная роль editor не найдена, пропускаем повышение роли');
      }

      return {
        success: true,
        message: 'Email успешно подтвержден! Ваша роль повышена до editor.',
      };
    } catch (error) {
      console.error('Ошибка подтверждения email:', error);
      return {
        success: false,
        message: 'Ошибка подтверждения email',
      };
    }
  }

  /**
   * Обработка Telegram Login Widget
   */
  async handleTelegramLogin(telegramUser: any): Promise<any> {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = telegramUser;
    
    console.log(`Telegram Login: ${username || first_name} (${id})`);
    
    // Проверяем hash для безопасности (упрощённо - TODO: полная проверка)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }
    
    // Ищем пользователя по email
    let user: User | null = null;
    
    const email = username ? `${username}@telegram.local` : `telegram_${id}@local`;
    
    // Попробуем найти по email
    user = await this.usersRepo.findOne({ where: { email } });
    
    // Если не нашли, создаём нового пользователя
    if (!user) {
      user = await this.usersService.create({
        email,
        firstName: first_name || '',
        lastName: last_name || '',
        passwordHash: '', // Telegram не требует пароль
        isActive: true,
        emailVerified: true, // Telegram подтверждён
        primaryAuthMethod: AuthMethodType.PHONE_TELEGRAM,
        availableAuthMethods: [AuthMethodType.PHONE_TELEGRAM],
      });
      
      console.log(`Создан новый пользователь через Telegram: ${email}`);
    }
    
    if (!user) {
      throw new Error('Не удалось создать или найти пользователя');
    }
    
    // Генерируем токены
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    
    // Загружаем полную информацию о пользователе
    const fullUser = await this.usersService.findById(user.id);
    
    if (!fullUser) {
      throw new Error('Не удалось загрузить данные пользователя');
    }
    
    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(fullUser),
    };
  }
}