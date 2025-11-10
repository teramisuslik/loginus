import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuthClient } from '../entities/oauth-client.entity';
import { AuthorizationCode } from '../entities/authorization-code.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { OrganizationMembership } from '../../organizations/entities/organization-membership.entity';
import { TeamMembership } from '../../teams/entities/team-membership.entity';
import { OrganizationRole } from '../../organizations/entities/organization-role.entity';
import { TeamRole } from '../../teams/entities/team-role.entity';
import { UserRoleAssignment } from '../../users/entities/user-role-assignment.entity';
import { Role } from '../../rbac/entities/role.entity';
import { Permission } from '../../rbac/entities/permission.entity';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthClient)
    private oauthClientRepo: Repository<OAuthClient>,
    @InjectRepository(AuthorizationCode)
    private authorizationCodeRepo: Repository<AuthorizationCode>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private orgMembershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(TeamMembership)
    private teamMembershipRepo: Repository<TeamMembership>,
    @InjectRepository(UserRoleAssignment)
    private userRoleAssignmentRepo: Repository<UserRoleAssignment>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
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
    
    // Логирование для отладки
    console.log(`🔍 [OAuth] Validating redirect URI for client ${clientId}`);
    console.log(`🔍 [OAuth] Requested redirect URI: ${redirectUri}`);
    console.log(`🔍 [OAuth] Registered redirect URIs:`, client.redirectUris);
    
    if (!client.redirectUris || !Array.isArray(client.redirectUris)) {
      console.error(`❌ [OAuth] Client ${clientId} has invalid redirectUris:`, client.redirectUris);
      return false;
    }
    
    const isValid = client.redirectUris.includes(redirectUri);
    console.log(`🔍 [OAuth] Validation result: ${isValid}`);
    
    return isValid;
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
   * Возвращает полную информацию: организации, команды, роли и права
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
    organizations?: Array<{
      id: string;
      name: string;
      role: {
        id: string;
        name: string;
        permissions: Array<{
          id: string;
          name: string;
          resource: string;
          action: string;
        }>;
      };
      joinedAt: Date;
    }>;
    teams?: Array<{
      id: string;
      name: string;
      organizationId?: string;
      role: {
        id: string;
        name: string;
        permissions: Array<{
          id: string;
          name: string;
          resource: string;
          action: string;
        }>;
      };
      joinedAt: Date;
    }>;
    globalRoles?: Array<{
      id: string;
      name: string;
      description?: string;
      permissions: Array<{
        id: string;
        name: string;
        resource: string;
        action: string;
      }>;
    }>;
  }> {
    try {
      const jwtSecret = this.configService.get<string>('jwt.secret') || 'default-secret';
      const payload = this.jwtService.verify(accessToken, { secret: jwtSecret });

      // Загружаем пользователя со всеми связями
      const user = await this.usersRepo.findOne({
        where: { id: payload.sub },
        relations: [
          'organizations',
          'teams',
          'organizationMemberships',
          'organizationMemberships.organization',
          'organizationMemberships.role',
          'teamMemberships',
          'teamMemberships.team',
          'teamMemberships.team.organization',
          'teamMemberships.role',
          'userRoleAssignments',
          'userRoleAssignments.role',
          'userRoleAssignments.role.permissions',
          'userRoleAssignments.organizationRole',
          'userRoleAssignments.teamRole',
          'userRoleAssignments.organization',
          'userRoleAssignments.team',
        ],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Получаем организации с ролями и правами
      // Сначала собираем все права из organizationMemberships
      const organizationsMap = new Map<string, {
        id: string;
        name: string;
        role: {
          id: string;
          name: string;
          permissions: Array<{
            id: string;
            name: string;
            resource: string;
            action: string;
          }>;
        };
        joinedAt: Date;
      }>();

      // Права из organizationMemberships
      for (const membership of user.organizationMemberships || []) {
        const orgRole = membership.role;
        const permissionNames = orgRole?.permissions || [];
        
        // Загружаем полную информацию о правах из таблицы permissions
        const permissions = permissionNames.length > 0
          ? await this.permissionRepo.find({
              where: { name: In(permissionNames) },
            })
          : [];

        organizationsMap.set(membership.organization.id, {
          id: membership.organization.id,
          name: membership.organization.name,
          role: {
            id: orgRole?.id || '',
            name: orgRole?.name || '',
            permissions: permissions.map(p => ({
              id: p.id,
              name: p.name,
              resource: p.resource,
              action: p.action,
            })),
          },
          joinedAt: membership.joinedAt,
        });
      }

      // Добавляем права из userRoleAssignments.organizationRole
      const orgRoleAssignments = (user.userRoleAssignments || [])
        .filter((assignment) => assignment.organizationRole && assignment.organizationId);
      
      for (const assignment of orgRoleAssignments) {
        if (assignment.organizationRole && assignment.organizationId) {
          const permissionNames = assignment.organizationRole.permissions || [];
          if (permissionNames.length > 0) {
            const permissions = await this.permissionRepo.find({
              where: { name: In(permissionNames) },
            });

            const orgData = organizationsMap.get(assignment.organizationId);
            if (orgData) {
              // Объединяем права, убирая дубликаты
              const existingPermIds = new Set(orgData.role.permissions.map(p => p.id));
              const newPermissions = permissions
                .filter(p => !existingPermIds.has(p.id))
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  resource: p.resource,
                  action: p.action,
                }));
              orgData.role.permissions.push(...newPermissions);
            } else {
              // Если организации нет в memberships, создаем новую запись
              // Нужно получить информацию об организации
              const org = assignment.organization;
              if (org) {
                organizationsMap.set(assignment.organizationId, {
                  id: org.id,
                  name: org.name,
                  role: {
                    id: assignment.organizationRole.id,
                    name: assignment.organizationRole.name,
                    permissions: permissions.map(p => ({
                      id: p.id,
                      name: p.name,
                      resource: p.resource,
                      action: p.action,
                    })),
                  },
                  joinedAt: assignment.createdAt,
                });
              }
            }
          }
        }
      }

      const organizations = Array.from(organizationsMap.values());

      // Получаем команды с ролями и правами
      // Сначала собираем все права из teamMemberships
      const teamsMap = new Map<string, {
        id: string;
        name: string;
        organizationId?: string;
        role: {
          id: string;
          name: string;
          permissions: Array<{
            id: string;
            name: string;
            resource: string;
            action: string;
          }>;
        };
        joinedAt: Date;
      }>();

      // Права из teamMemberships
      for (const membership of user.teamMemberships || []) {
        const teamRole = membership.role;
        const permissionNames = teamRole?.permissions || [];
        
        // Загружаем полную информацию о правах из таблицы permissions
        const permissions = permissionNames.length > 0
          ? await this.permissionRepo.find({
              where: { name: In(permissionNames) },
            })
          : [];

        teamsMap.set(membership.team.id, {
          id: membership.team.id,
          name: membership.team.name,
          organizationId: membership.team.organizationId || undefined,
          role: {
            id: teamRole?.id || '',
            name: teamRole?.name || '',
            permissions: permissions.map(p => ({
              id: p.id,
              name: p.name,
              resource: p.resource,
              action: p.action,
            })),
          },
          joinedAt: membership.joinedAt,
        });
      }

      // Добавляем права из userRoleAssignments.teamRole
      const teamRoleAssignments = (user.userRoleAssignments || [])
        .filter((assignment) => assignment.teamRole && assignment.teamId);
      
      for (const assignment of teamRoleAssignments) {
        if (assignment.teamRole && assignment.teamId) {
          const permissionNames = assignment.teamRole.permissions || [];
          if (permissionNames.length > 0) {
            const permissions = await this.permissionRepo.find({
              where: { name: In(permissionNames) },
            });

            const teamData = teamsMap.get(assignment.teamId);
            if (teamData) {
              // Объединяем права, убирая дубликаты
              const existingPermIds = new Set(teamData.role.permissions.map(p => p.id));
              const newPermissions = permissions
                .filter(p => !existingPermIds.has(p.id))
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  resource: p.resource,
                  action: p.action,
                }));
              teamData.role.permissions.push(...newPermissions);
            } else {
              // Если команды нет в memberships, создаем новую запись
              const team = assignment.team;
              if (team) {
                teamsMap.set(assignment.teamId, {
                  id: team.id,
                  name: team.name,
                  organizationId: team.organizationId || undefined,
                  role: {
                    id: assignment.teamRole.id,
                    name: assignment.teamRole.name,
                    permissions: permissions.map(p => ({
                      id: p.id,
                      name: p.name,
                      resource: p.resource,
                      action: p.action,
                    })),
                  },
                  joinedAt: assignment.createdAt,
                });
              }
            }
          }
        }
      }

      const teams = Array.from(teamsMap.values());

      // Получаем глобальные роли и права
      const globalRoles = (user.userRoleAssignments || [])
        .filter((assignment) => !assignment.organizationId && !assignment.teamId && assignment.role)
        .map((assignment) => {
          const role = assignment.role!;
          const permissions = (role.permissions || []).map((perm) => ({
            id: perm.id,
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
          }));

          return {
            id: role.id,
            name: role.name,
            description: role.description || undefined,
            permissions,
          };
        });

      // allPermissions больше не нужен - права разделены по источникам:
      // - organizations[].role.permissions - права конкретной организации
      // - teams[].role.permissions - права конкретной команды
      // - globalRoles[].permissions - глобальные права

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
        organizations: organizations.length > 0 ? organizations : undefined,
        teams: teams.length > 0 ? teams : undefined,
        globalRoles: globalRoles.length > 0 ? globalRoles : undefined,
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

