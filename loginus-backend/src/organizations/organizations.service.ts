import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationRole } from './entities/organization-role.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { User } from '../users/entities/user.entity';
import { UserRoleAssignment } from '../users/entities/user-role-assignment.entity';
import { Role } from '../rbac/entities/role.entity';
import { RoleHierarchyService } from '../rbac/role-hierarchy.service';
import { Team } from '../teams/entities/team.entity';
import { TeamRole } from '../teams/entities/team-role.entity';
import { TeamMembership } from '../teams/entities/team-membership.entity';

export interface CreateOrganizationDto {
  name: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationDto {
  name?: string;
  settings?: Record<string, any>;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationRole)
    private orgRoleRepo: Repository<OrganizationRole>,
    @InjectRepository(OrganizationMembership)
    private orgMembershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(UserRoleAssignment)
    private userRoleAssignmentRepo: Repository<UserRoleAssignment>,
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(TeamRole)
    private teamRoleRepo: Repository<TeamRole>,
    @InjectRepository(TeamMembership)
    private teamMembershipRepo: Repository<TeamMembership>,
    private roleHierarchyService: RoleHierarchyService,
  ) {}

  /**
   * Создать организацию
   */
  async createOrganization(
    dto: CreateOrganizationDto,
    creatorId: string,
  ): Promise<Organization> {
    // Проверяем права на создание
    const canCreate = await this.roleHierarchyService.canCreateTeams(creatorId, '');
    if (!canCreate) {
      throw new ForbiddenException('Недостаточно прав для создания организации');
    }

    // Создаем организацию
    const organization = this.orgRepo.create({
      ...dto,
      createdBy: creatorId,
    });

    const savedOrg = await this.orgRepo.save(organization);

    // Создаем системные роли для организации
    await this.createSystemRoles(savedOrg.id);

    // Добавляем создателя как super_admin
    await this.addMemberToOrganization(savedOrg.id, creatorId, 'super_admin', creatorId);

    return savedOrg;
  }

  /**
   * Копировать глобальные роли в organization_roles для организации
   */
  private async copyGlobalRolesToOrganization(organizationId: string): Promise<void> {
    console.log(`🔧 [OrganizationsService] copyGlobalRolesToOrganization called for organization ${organizationId}`);
    
    // Получаем все глобальные роли
    const globalRoles = await this.rolesRepo.find({
      where: { isGlobal: true },
      relations: ['permissions'],
    });

    console.log(`🔧 [OrganizationsService] Found ${globalRoles.length} global roles to copy`);

    // Уровни ролей
    const ROLE_LEVELS: Record<string, number> = {
      super_admin: 100,
      admin: 80,
      manager: 60,
      editor: 40,
      viewer: 20,
    };

    // Копируем каждую роль в organization_roles
    for (const globalRole of globalRoles) {
      try {
        // Проверяем, нет ли уже такой роли
        const existingRole = await this.orgRoleRepo.findOne({
          where: { organizationId, name: globalRole.name },
        });

        if (existingRole) {
          console.log(`⚠️ [OrganizationsService] Role ${globalRole.name} already exists in organization ${organizationId}`);
          continue;
        }

        const orgRole = this.orgRoleRepo.create({
          name: globalRole.name,
          description: globalRole.description || '',
          organizationId,
          permissions: globalRole.permissions?.map(p => p.name) || [],
          level: ROLE_LEVELS[globalRole.name] || 0,
          isSystem: globalRole.isSystem || false,
        });

        const savedRole = await this.orgRoleRepo.save(orgRole);
        console.log(`✅ [OrganizationsService] Copied role ${savedRole.name} (level ${savedRole.level}) for organization ${organizationId}`);
      } catch (error) {
        console.error(`❌ [OrganizationsService] Error copying role ${globalRole.name}:`, error);
        throw error;
      }
    }

    console.log(`✅ [OrganizationsService] All ${globalRoles.length} global roles copied to organization ${organizationId}`);
  }

  /**
   * Создать системные роли для организации
   */
  private async createSystemRoles(organizationId: string): Promise<void> {
    const systemRoles = [
      {
        name: 'super_admin',
        description: 'Суперадминистратор организации',
        permissions: ['organizations.manage', 'teams.create', 'teams.manage', 'users.invite', 'users.manage', 'roles.manage'],
        level: 100,
      },
      {
        name: 'admin',
        description: 'Администратор организации',
        permissions: ['teams.create', 'teams.manage', 'users.invite', 'users.manage'],
        level: 80,
      },
      {
        name: 'manager',
        description: 'Менеджер организации',
        permissions: ['teams.manage', 'users.invite', 'users.manage'],
        level: 60,
      },
      {
        name: 'editor',
        description: 'Редактор организации',
        permissions: ['organizations.read', 'teams.read'],
        level: 40,
      },
      {
        name: 'viewer',
        description: 'Наблюдатель организации',
        permissions: ['organizations.read'],
        level: 20,
      },
    ];

    for (const roleData of systemRoles) {
      const role = this.orgRoleRepo.create({
        ...roleData,
        organizationId,
        isSystem: true,
      });
      await this.orgRoleRepo.save(role);
    }
  }

  /**
   * Добавить участника в организацию
   */
  async addMemberToOrganization(
    organizationId: string,
    userId: string,
    roleName: string,
    invitedBy: string,
  ): Promise<OrganizationMembership> {
    // Проверяем права на приглашение (кроме случая, когда создатель добавляет себя)
    if (userId !== invitedBy) {
      const canInvite = await this.roleHierarchyService.canInviteUsers(invitedBy, { organizationId });
      if (!canInvite) {
        throw new ForbiddenException('Недостаточно прав для приглашения в организацию');
      }
    }

    // Находим роль
    const role = await this.orgRoleRepo.findOne({
      where: { name: roleName, organizationId },
    });

    if (!role) {
      throw new NotFoundException(`Роль ${roleName} не найдена в организации`);
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMembership = await this.orgMembershipRepo.findOne({
      where: { userId, organizationId },
    });

    if (existingMembership) {
      throw new ForbiddenException('Пользователь уже является участником организации');
    }

    // Создаем членство
    const membership = this.orgMembershipRepo.create({
      userId,
      organizationId,
      roleId: role.id,
      invitedBy,
    });

    return this.orgMembershipRepo.save(membership);
  }

  /**
   * Изменить роль участника организации
   */
  async changeMemberRole(
    organizationId: string,
    userId: string,
    newRoleName: string,
    changedBy: string,
  ): Promise<OrganizationMembership | null> {
    // Проверяем права на изменение роли
    const canManage = await this.roleHierarchyService.canManageUser(changedBy, userId, { organizationId });
    if (!canManage) {
      throw new ForbiddenException('Недостаточно прав для изменения роли');
    }

    // Находим новую роль
    const newRole = await this.orgRoleRepo.findOne({
      where: { name: newRoleName, organizationId },
    });

    if (!newRole) {
      throw new NotFoundException(`Роль ${newRoleName} не найдена в организации`);
    }

    // Обновляем роль
    await this.orgMembershipRepo.update(
      { userId, organizationId },
      { roleId: newRole.id },
    );

    const membership = await this.orgMembershipRepo.findOne({
      where: { userId, organizationId },
      relations: ['role', 'user'],
    });
    return membership || null;
  }

  /**
   * Удалить участника из организации
   */
  async removeMemberFromOrganization(
    organizationId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    // Проверяем права на удаление
    const canManage = await this.roleHierarchyService.canManageUser(removedBy, userId, { organizationId });
    if (!canManage) {
      throw new ForbiddenException('Недостаточно прав для удаления участника');
    }

    // Удаляем из новой системы (organization_memberships) через SQL для точного контроля
    try {
      const deleteResult = await this.orgMembershipRepo.manager.query(
        'DELETE FROM organization_memberships WHERE "userId" = $1 AND "organizationId" = $2',
        [userId, organizationId]
      );
      console.log(`✅ Removed user ${userId} from organization ${organizationId} (organization_memberships), deleted rows: ${deleteResult[1] || 0}`);
    } catch (error: any) {
      console.error(`❌ Error removing from organization_memberships: ${error.message}`);
      throw error;
    }

    // Удаляем из старой системы (user_organizations)
    try {
      await this.orgMembershipRepo.manager.query(
        'DELETE FROM user_organizations WHERE "userId" = $1 AND "organizationId" = $2',
        [userId, organizationId]
      );
      console.log(`✅ Removed user ${userId} from organization ${organizationId} (user_organizations)`);
    } catch (error: any) {
      console.warn(`⚠️ Could not remove from user_organizations (table may not exist): ${error.message}`);
    }

    // Удаляем назначения ролей для этой организации (user_role_assignments)
    try {
      await this.orgMembershipRepo.manager.query(
        'DELETE FROM user_role_assignments WHERE "userId" = $1 AND "organizationId" = $2',
        [userId, organizationId]
      );
      console.log(`✅ Removed user ${userId} role assignments for organization ${organizationId} (user_role_assignments)`);
    } catch (error: any) {
      console.warn(`⚠️ Could not remove from user_role_assignments: ${error.message}`);
    }
  }

  /**
   * Получить участников организации
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMembership[]> {
    return this.orgMembershipRepo.find({
      where: { organizationId },
      relations: ['user', 'role', 'inviter'],
    });
  }

  /**
   * Получить организации пользователя
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    // Проверяем, является ли пользователь суперадмином
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['userRoleAssignments', 'userRoleAssignments.role'],
    });

    const isSuperAdmin = user?.userRoleAssignments?.some(
      assignment => assignment.role?.name === 'super_admin' && !assignment.organizationId && !assignment.teamId
    );

    if (isSuperAdmin) {
      // Суперадмин видит все организации
      return this.orgRepo.find({
        relations: ['teams', 'memberships', 'memberships.user', 'creator'],
      });
    }

    // Обычные пользователи видят только свои организации
    const memberships = await this.orgMembershipRepo.find({
      where: { userId },
      relations: ['organization', 'organization.teams', 'organization.memberships', 'organization.memberships.user', 'organization.creator', 'role'],
    });

    return memberships.map(membership => membership.organization);
  }

  /**
   * Получить организацию по ID
   */
  async getOrganizationById(id: string): Promise<Organization> {
    const organization = await this.orgRepo.findOne({
      where: { id },
      relations: ['teams', 'memberships', 'memberships.user', 'memberships.role'],
    });

    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    return organization;
  }

  /**
   * Обновить организацию
   */
  async updateOrganization(
    id: string,
    dto: UpdateOrganizationDto,
    updatedBy: string,
  ): Promise<Organization> {
    const organization = await this.getOrganizationById(id);

    // Проверяем права на редактирование
    const userRole = await this.roleHierarchyService.getUserEffectiveRole(updatedBy, { organizationId: id });
    if (!['super_admin', 'admin'].includes(userRole.role)) {
      throw new ForbiddenException('Недостаточно прав для редактирования организации');
    }

    await this.orgRepo.update(id, dto);
    return this.getOrganizationById(id);
  }

  /**
   * Удалить организацию
   */
  async deleteOrganization(id: string, deletedBy: string): Promise<void> {
    console.log(`🗑️ Starting deletion of organization ${id} by user ${deletedBy}`);
    
    const organization = await this.getOrganizationById(id);
    console.log(`🗑️ Found organization: ${organization.name}`);

    // Проверяем права на удаление
    const userRole = await this.roleHierarchyService.getUserEffectiveRole(deletedBy, { organizationId: id });
    console.log(`🗑️ User role for deletion: ${userRole.role}`);
    
    if (!['super_admin', 'admin', 'manager'].includes(userRole.role)) {
      console.log(`🗑️ Access denied for user ${deletedBy} with role ${userRole.role}`);
      throw new ForbiddenException('Недостаточно прав для удаления организации');
    }

    console.log(`🗑️ Access granted, proceeding with deletion`);

    // Удаляем все связанные записи перед удалением организации
    // 1. Удаляем членство пользователей в организации
    console.log(`🗑️ Deleting organization memberships...`);
    await this.orgMembershipRepo.delete({ organizationId: id });

    // 2. Удаляем роли организации
    console.log(`🗑️ Deleting organization roles...`);
    await this.orgRoleRepo.delete({ organizationId: id });

    // 3. Удаляем команды организации (они удалят свои связанные записи через каскад)
    console.log(`🗑️ Finding teams in organization...`);
    const teams = await this.teamRepo.find({ where: { organizationId: id } });
    console.log(`🗑️ Found ${teams.length} teams to delete`);
    
    for (const team of teams) {
      console.log(`🗑️ Deleting team ${team.id} (${team.name})`);
      // Удаляем членство в команде (новая система)
      await this.teamMembershipRepo.delete({ teamId: team.id });
      // Удаляем роли команды
      await this.teamRoleRepo.delete({ teamId: team.id });
      // Удаляем записи из старой системы ManyToMany (user_teams)
      await this.teamRepo.query('DELETE FROM user_teams WHERE team_id = $1', [team.id]);
      // Удаляем команду
      await this.teamRepo.delete(team.id);
    }

    // 4. Удаляем саму организацию
    console.log(`🗑️ Deleting organization ${id}...`);
    await this.orgRepo.delete(id);
    console.log(`🗑️ Organization ${id} deleted successfully`);
  }

  /**
   * Получить роли организации
   */
  async getOrganizationRoles(organizationId: string, userId: string): Promise<any[]> {
    console.log(`🔍 [OrganizationsService] getOrganizationRoles called for org ${organizationId}, user ${userId}`);
    
    // Получаем роли из organization_roles для организации
    let allRoles = await this.orgRoleRepo.find({
      where: { organizationId },
      order: { level: 'DESC' },
    });

    console.log(`🔍 [OrganizationsService] Found ${allRoles.length} roles in organization_roles for organization ${organizationId}`);
    
    if (allRoles.length > 0) {
      console.log(`🔍 [OrganizationsService] Role names found:`, allRoles.map(r => `${r.name} (level: ${r.level})`));
    } else {
      console.log(`⚠️ [OrganizationsService] No roles found in organization_roles for ${organizationId}, checking if organization exists...`);
      const org = await this.orgRepo.findOne({ where: { id: organizationId } });
      console.log(`🔍 [OrganizationsService] Organization exists: ${!!org}`);
      
      // Если ролей нет - заполняем из глобальных ролей
      console.log(`⚠️ [OrganizationsService] No roles in organization_roles, copying from global roles...`);
      try {
        await this.copyGlobalRolesToOrganization(organizationId);
        // Загружаем роли снова
        allRoles = await this.orgRoleRepo.find({
          where: { organizationId },
          order: { level: 'DESC' },
        });
        console.log(`✅ [OrganizationsService] Copied and loaded ${allRoles.length} roles from global roles`);
        if (allRoles.length > 0) {
          console.log(`🔍 [OrganizationsService] Role names after copy:`, allRoles.map(r => `${r.name} (level: ${r.level})`));
        } else {
          console.error(`❌ [OrganizationsService] After copy: still no roles found! Something went wrong.`);
        }
      } catch (error) {
        console.error(`❌ [OrganizationsService] Error copying roles:`, error);
        throw error;
      }
    }

    // Преобразуем роли в формат, ожидаемый getAvailableRolesForInvite
    const rolesForFilter = allRoles.map(role => ({
      name: role.name,
      level: role.level,
      id: role.id,
      description: role.description || '',
    }));
    
    console.log(`🔍 [OrganizationsService] Prepared ${rolesForFilter.length} roles for filtering:`, rolesForFilter.map(r => `${r.name} (level ${r.level})`));
    
    // Фильтруем роли по уровню пользователя
    const filteredRoles = await this.roleHierarchyService.getAvailableRolesForInvite(
      userId,
      { organizationId },
      rolesForFilter,
    );
    
    console.log(`🔍 [OrganizationsService] Returning ${filteredRoles.length} available roles (after filtering)`);
    console.log(`🔍 [OrganizationsService] Role names:`, filteredRoles.map(r => r.name));
    
    return filteredRoles;
  }

  /**
   * Получить роли организации (legacy метод для обратной совместимости)
   */
  async getGlobalRolesFromRolesTable(userId: string): Promise<any[]> {
    // Этот метод больше не используется, но оставлен для обратной совместимости
    // Используйте getOrganizationRoles вместо этого
    return [];
  }
}