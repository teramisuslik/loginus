import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { OrganizationRole } from '../organizations/entities/organization-role.entity';
import { TeamRole } from '../teams/entities/team-role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Team } from '../teams/entities/team.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
    @InjectRepository(Permission) private permissionsRepo: Repository<Permission>,
    @InjectRepository(OrganizationRole) private orgRoleRepo: Repository<OrganizationRole>,
    @InjectRepository(TeamRole) private teamRoleRepo: Repository<TeamRole>,
    @InjectRepository(Organization) private organizationRepo: Repository<Organization>,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
  ) {}

  /**
   * Проверка наличия конкретного права у пользователя
   */
  async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) return false;

    return user.userRoleAssignments?.some(assignment =>
      assignment.role?.permissions?.some(perm => perm.name === permissionName)
    ) || false;
  }

  /**
   * Проверка наличия роли у пользователя
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['userRoleAssignments', 'userRoleAssignments.role'],
    });

    return user?.userRoleAssignments?.some(assignment => 
      assignment.role && assignment.role.name === roleName
    ) ?? false;
  }

  /**
   * Получение всех прав пользователя (уникальный список)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) return [];

    const permissions = new Set<string>();
    user.userRoleAssignments?.forEach(assignment => {
      assignment.role?.permissions?.forEach(perm => permissions.add(perm.name));
    });

    return Array.from(permissions);
  }

  /**
   * Назначение роли пользователю
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    grantedBy: string,
    expiresAt?: Date,
  ): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['organization', 'team'],
    });
    
    const role = await this.rolesRepo.findOne({
      where: { id: roleId },
    });

    if (!user || !role) {
      throw new NotFoundException('User or Role not found');
    }

    // Проверка scope: роль должна быть в той же организации
    if (role.organizationId && !user.organizations?.some(org => org.id === role.organizationId)) {
      throw new ForbiddenException('Role not in same organization');
    }

    // Проверка scope: роль команды только для членов команды
    if (role.teamId && !user.teams?.some(team => team.id === role.teamId)) {
      throw new ForbiddenException('Role not in same team');
    }

    // Проверяем, не назначена ли уже эта роль пользователю
    const existingUserRole = await this.usersRepo
      .createQueryBuilder()
      .relation(User, 'roles')
      .of(userId)
      .loadMany();
    
    const isAlreadyAssigned = existingUserRole.some(userRole => userRole.id === roleId);
    if (isAlreadyAssigned) {
      // Роль уже назначена, ничего не делаем
      return;
    }

    // Назначение роли через промежуточную таблицу
    await this.usersRepo
      .createQueryBuilder()
      .relation(User, 'roles')
      .of(userId)
      .add(roleId);

    // TODO: Сохранить granted_by и expires_at в user_roles
  }

  /**
   * Удаление роли у пользователя
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.usersRepo
      .createQueryBuilder()
      .relation(User, 'roles')
      .of(userId)
      .remove(roleId);
  }

  /**
   * Замена всех ролей пользователя на новую роль
   */
  async replaceUserRole(
    userId: string,
    newRoleId: string,
    grantedBy: string,
  ): Promise<void> {
    // Сначала получаем пользователя с текущими ролями
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['userRoleAssignments', 'userRoleAssignments.role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log('🔍 Текущие роли пользователя:', user.userRoleAssignments?.map(a => a.role?.name).filter(Boolean));

    // Удаляем все текущие роли через прямой SQL запрос
    await this.usersRepo.query(
      'DELETE FROM user_roles WHERE "userId" = $1',
      [userId]
    );

    console.log('🔍 Удалили все роли пользователя');

    // Назначаем новую роль через прямой SQL запрос
    await this.usersRepo.query(
      'INSERT INTO user_roles ("userId", "roleId") VALUES ($1, $2)',
      [userId, newRoleId]
    );

    console.log('🔍 Назначили новую роль:', newRoleId);
  }

  /**
   * Создание кастомной роли (не системной)
   */
  async createRole(
    name: string,
    description: string,
    organizationId?: string,
    teamId?: string,
    permissionIds: string[] = [],
    isGlobal: boolean = true,
    level?: number,
  ): Promise<Role> {
    // Проверяем, что название содержит только латинские буквы, цифры и подчеркивания
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new ConflictException('Название роли может содержать только латинские буквы, цифры и подчеркивания');
    }

    // Проверяем уникальность названия роли
    const existingRole = await this.rolesRepo.findOne({
      where: { name }
    });

    if (existingRole) {
      throw new ConflictException('Роль с таким названием уже существует');
    }

    const role = this.rolesRepo.create({
      name,
      description,
      organizationId,
      teamId,
      isSystem: false,
      isGlobal,
    });

    await this.rolesRepo.save(role);

    // Назначение прав
    if (permissionIds.length > 0) {
      await this.rolesRepo
        .createQueryBuilder()
        .relation(Role, 'permissions')
        .of(role.id)
        .add(permissionIds);
    }

    // Если роль глобальная (системная или кастомная), синхронизируем с organization_roles и team_roles
    if (role.isGlobal) {
      await this.syncGlobalRoleToOrganizations(role.name, level);
      await this.syncGlobalRoleToTeams(role.name, level);
    }

    return role;
  }

  /**
   * Обновление прав роли
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
    userId?: string,
  ): Promise<void> {
    const role = await this.rolesRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Разрешаем изменение прав для всех ролей (включая системные)
    // Права можно изменять, так как это не влияет на структуру роли

    // Удаляем все текущие права
    const currentPermissionIds = role.permissions.map(p => p.id);
    if (currentPermissionIds.length > 0) {
      await this.rolesRepo
        .createQueryBuilder()
        .relation(Role, 'permissions')
        .of(roleId)
        .remove(currentPermissionIds);
    }

    // Добавляем новые
    if (permissionIds.length > 0) {
      await this.rolesRepo
        .createQueryBuilder()
        .relation(Role, 'permissions')
        .of(roleId)
        .add(permissionIds);
    }

    // Если роль глобальная (системная или кастомная), синхронизируем с organization_roles и team_roles
    // Для обновления прав level не передаем, используем существующий из organization_roles/team_roles
    if (role.isGlobal) {
      await this.syncGlobalRoleToOrganizations(role.name);
      await this.syncGlobalRoleToTeams(role.name);
    }
  }

  /**
   * Синхронизация глобальной роли (системной или кастомной) со всеми organization_roles
   * Вызывается при изменении прав глобальной роли или создании новой роли
   */
  private async syncGlobalRoleToOrganizations(roleName: string, level?: number): Promise<void> {
    console.log(`🔄 [RbacService] Syncing global role ${roleName} to all organization_roles`);
    
    // Получаем обновленную роль с правами
    const globalRole = await this.rolesRepo.findOne({
      where: { name: roleName, isGlobal: true },
      relations: ['permissions'],
    });

    if (!globalRole) {
      console.warn(`⚠️ [RbacService] Global role ${roleName} not found`);
      return;
    }

    const permissionNames = globalRole.permissions?.map(p => p.name) || [];
    
    // Получаем все организации из таблицы organizations
    const organizations = await this.organizationRepo.find({
      select: ['id'],
    });
    
    const organizationIds = organizations.map(org => org.id);
    
    // Уровни ролей (используются только если level не передан явно)
    const ROLE_LEVELS: Record<string, number> = {
      super_admin: 100,
      admin: 80,
      manager: 60,
      editor: 40,
      viewer: 20,
    };
    
    // Используем переданный level или значение из ROLE_LEVELS, или 0 по умолчанию
    const roleLevel = level !== undefined ? level : (ROLE_LEVELS[roleName] || 0);
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Для каждой организации проверяем/создаем/обновляем роль
    for (const orgId of organizationIds) {
      const existingRole = await this.orgRoleRepo.findOne({
        where: { organizationId: orgId, name: roleName },
      });
      
      if (existingRole) {
        // Обновляем существующую роль
        existingRole.permissions = permissionNames;
        existingRole.isSystem = globalRole.isSystem || false;
        // Обновляем level только если он был передан явно (при создании новой роли)
        if (level !== undefined) {
          existingRole.level = roleLevel;
        }
        await this.orgRoleRepo.save(existingRole);
        updatedCount++;
      } else {
        // Создаем новую роль
        const newOrgRole = this.orgRoleRepo.create({
          name: roleName,
          description: globalRole.description || '',
          organizationId: orgId,
          permissions: permissionNames,
          level: roleLevel,
          isSystem: globalRole.isSystem || false,
        });
        await this.orgRoleRepo.save(newOrgRole);
        createdCount++;
      }
    }

    console.log(`✅ [RbacService] Synced role ${roleName}: created ${createdCount}, updated ${updatedCount} organization_roles`);
  }

  /**
   * Синхронизация глобальной роли (системной или кастомной) со всеми team_roles
   * Вызывается при изменении прав глобальной роли или создании новой роли
   */
  private async syncGlobalRoleToTeams(roleName: string, level?: number): Promise<void> {
    console.log(`🔄 [RbacService] Syncing global role ${roleName} to all team_roles`);
    
    // Получаем обновленную роль с правами
    const globalRole = await this.rolesRepo.findOne({
      where: { name: roleName, isGlobal: true },
      relations: ['permissions'],
    });

    if (!globalRole) {
      console.warn(`⚠️ [RbacService] Global role ${roleName} not found`);
      return;
    }

    const permissionNames = globalRole.permissions?.map(p => p.name) || [];
    
    // Получаем все команды из таблицы teams
    const teams = await this.teamRepo.find({
      select: ['id'],
    });
    
    const teamIds = teams.map(team => team.id);
    
    // Уровни ролей (используются только если level не передан явно)
    const ROLE_LEVELS: Record<string, number> = {
      super_admin: 100,
      admin: 80,
      manager: 60,
      editor: 40,
      viewer: 20,
    };
    
    // Используем переданный level или значение из ROLE_LEVELS, или 0 по умолчанию
    const roleLevel = level !== undefined ? level : (ROLE_LEVELS[roleName] || 0);
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Для каждой команды проверяем/создаем/обновляем роль
    for (const teamId of teamIds) {
      const existingRole = await this.teamRoleRepo.findOne({
        where: { teamId: teamId, name: roleName },
      });
      
      if (existingRole) {
        // Обновляем существующую роль
        existingRole.permissions = permissionNames;
        existingRole.isSystem = globalRole.isSystem || false;
        // Обновляем level только если он был передан явно (при создании новой роли)
        if (level !== undefined) {
          existingRole.level = roleLevel;
        }
        await this.teamRoleRepo.save(existingRole);
        updatedCount++;
      } else {
        // Создаем новую роль
        const newTeamRole = this.teamRoleRepo.create({
          name: roleName,
          description: globalRole.description || '',
          teamId: teamId,
          permissions: permissionNames,
          level: roleLevel,
          isSystem: globalRole.isSystem || false,
        });
        await this.teamRoleRepo.save(newTeamRole);
        createdCount++;
      }
    }

    console.log(`✅ [RbacService] Synced role ${roleName}: created ${createdCount}, updated ${updatedCount} team_roles`);
  }

  /**
   * Удаление роли (только не системные)
   * Также удаляет роль из organization_roles и team_roles
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.rolesRepo.findOne({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system role');
    }

    // Удаляем роль из organization_roles
    const orgRolesDeleted = await this.orgRoleRepo.delete({ name: role.name });
    console.log(`🗑️ [RbacService] Deleted ${orgRolesDeleted.affected || 0} organization_roles for role ${role.name}`);

    // Удаляем роль из team_roles
    const teamRolesDeleted = await this.teamRoleRepo.delete({ name: role.name });
    console.log(`🗑️ [RbacService] Deleted ${teamRolesDeleted.affected || 0} team_roles for role ${role.name}`);

    // Удаляем саму роль из roles
    await this.rolesRepo.delete(roleId);
    console.log(`✅ [RbacService] Deleted role ${role.name} from roles table`);
  }

  /**
   * Получение всех доступных ролей (системные и кастомные)
   * Возвращает все глобальные роли с полными данными и permissions
   */
  async getAllRoles(): Promise<Role[]> {
    const roles = await this.rolesRepo.find({
      where: {
        isGlobal: true,
      },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
    return roles;
  }

  /**
   * Получение ролей доступных для назначения пользователям
   * Только 3 роли: super_admin, admin, viewer
   */
  async getAssignableRoles(): Promise<Partial<Role>[]> {
    return this.rolesRepo.find({
      where: {
        isGlobal: true,
        name: In(['super_admin', 'admin', 'viewer']),
      },
      select: ['id', 'name', 'description', 'isGlobal'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Получение ролей для настроек (только глобальные, без permissions)
   */
  async getRolesForSettings(): Promise<Partial<Role>[]> {
    return this.rolesRepo.find({
      where: { isGlobal: true },
      select: ['id', 'name', 'description', 'isGlobal'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Получение всех ролей организации
   */
  async getOrganizationRoles(organizationId: string): Promise<Role[]> {
    return this.rolesRepo.find({
      where: [
        { organizationId },
        { isSystem: true },
      ],
      relations: ['permissions'],
    });
  }

  /**
   * Получение всех доступных прав
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionsRepo.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  /**
   * Получение роли по ID
   */
  async getRoleById(roleId: string): Promise<Role> {
    const role = await this.rolesRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    return role;
  }

  /**
   * Поиск роли по имени в контексте организации/команды
   */
  async findRoleByName(
    roleName: string,
    organizationId?: string | null,
    teamId?: string | null,
  ): Promise<Role | null> {
    const whereConditions: any = { name: roleName };
    
    if (organizationId) {
      whereConditions.organizationId = organizationId;
    } else {
      whereConditions.organizationId = null;
    }
    
    if (teamId) {
      whereConditions.teamId = teamId;
    } else {
      whereConditions.teamId = null;
    }

    return this.rolesRepo.findOne({
      where: whereConditions,
    });
  }

  /**
   * Получение роли по умолчанию
   */
  async getDefaultRole(): Promise<Role | null> {
    return this.rolesRepo.findOne({
      where: { name: 'viewer' },
    });
  }

  /**
   * Получить глобальные роли
   */
  async getGlobalRoles(): Promise<Role[]> {
    return this.rolesRepo.find({
      where: { isGlobal: true },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Получить роли команд
   */
  async getTeamRoles(): Promise<Role[]> {
    return this.rolesRepo.find({
      where: { isGlobal: false },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Получить роли по типу
   */
  async getRolesByType(isGlobal: boolean): Promise<Role[]> {
    return this.rolesRepo.find({
      where: { isGlobal },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Создание нового права
   */
  async createPermission(createPermissionDto: any): Promise<Permission> {
    // Проверяем, не существует ли уже право с таким именем
    const existingPermission = await this.permissionsRepo.findOne({
      where: { name: createPermissionDto.name }
    });

    if (existingPermission) {
      throw new ConflictException('Право с таким именем уже существует');
    }

    // Проверяем, не существует ли уже право с такой комбинацией resource + action
    const existingCombination = await this.permissionsRepo.findOne({
      where: { 
        resource: createPermissionDto.resource,
        action: createPermissionDto.action
      }
    });

    if (existingCombination) {
      throw new ConflictException(`Право с комбинацией "${createPermissionDto.resource}.${createPermissionDto.action}" уже существует`);
    }

    const permission = this.permissionsRepo.create({
      name: createPermissionDto.name,
      description: createPermissionDto.description,
      resource: createPermissionDto.resource,
      action: createPermissionDto.action,
    });

    return this.permissionsRepo.save(permission);
  }

  /**
   * Обновление роли
   */
  async updateRole(roleId: string, updateRoleDto: any, userId?: string): Promise<Role> {
    const role = await this.rolesRepo.findOne({
      where: { id: roleId }
    });

    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    // Разрешаем редактирование всех ролей (включая системные)
    // Можно изменять название и описание, так как это не влияет на структуру роли

    // Обновляем только переданные поля
    if (updateRoleDto.name) {
      // Проверяем, что название содержит только латинские буквы, цифры и подчеркивания
      if (!/^[a-zA-Z0-9_]+$/.test(updateRoleDto.name)) {
        throw new ConflictException('Название роли может содержать только латинские буквы, цифры и подчеркивания');
      }

      // Проверяем уникальность названия роли (если оно изменилось)
      if (updateRoleDto.name !== role.name) {
        const existingRole = await this.rolesRepo.findOne({
          where: { name: updateRoleDto.name }
        });

        if (existingRole) {
          throw new ConflictException('Роль с таким названием уже существует');
        }
      }

      role.name = updateRoleDto.name;
    }
    if (updateRoleDto.description !== undefined) {
      role.description = updateRoleDto.description;
    }

    return this.rolesRepo.save(role);
  }
}
