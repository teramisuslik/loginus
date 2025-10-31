import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { TeamMembership } from '../teams/entities/team-membership.entity';

export interface UserRoleContext {
  organizationId?: string;
  teamId?: string;
}

export interface EffectiveRole {
  role: string;
  scope: 'global' | 'organization' | 'team';
  permissions: string[];
}

@Injectable()
export class RoleHierarchyService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private orgMembershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(TeamMembership)
    private teamMembershipRepo: Repository<TeamMembership>,
  ) {}

  /**
   * Получить эффективную роль пользователя в контексте
   */
  async getUserEffectiveRole(
    userId: string,
    context: UserRoleContext = {},
  ): Promise<EffectiveRole> {
    // 1. Проверяем глобальную роль
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['userRoleAssignments', 'userRoleAssignments.role', 'userRoleAssignments.organizationRole', 'userRoleAssignments.teamRole'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    const globalRole = user.userRoleAssignments?.find(assignment => assignment.role && !assignment.organizationId && !assignment.teamId)?.role;
    
    // ПРИОРИТЕТ 1: Если пользователь глобальный super_admin, всегда возвращаем super_admin
    // (даже если есть организационная роль - super_admin имеет приоритет)
    if (globalRole?.name === 'super_admin') {
      console.log(`🔍 [RoleHierarchyService] User ${userId} is global super_admin, returning super_admin for context:`, context);
      return {
        role: 'super_admin',
        scope: 'global',
        permissions: globalRole.permissions?.map(p => p.name) || [],
      };
    }

    // 2. Проверяем командную роль (приоритет)
    if (context.teamId) {
      // Сначала проверяем UserRoleAssignment для команды
      const teamRoleAssignment = user.userRoleAssignments?.find(assignment => 
        assignment.teamRole && assignment.teamId === context.teamId
      );
      
      if (teamRoleAssignment?.teamRole) {
        return {
          role: teamRoleAssignment.teamRole.name,
          scope: 'team',
          permissions: teamRoleAssignment.teamRole.permissions || [],
        };
      }

      // Затем проверяем через TeamMembership
      const teamMembership = await this.teamMembershipRepo.findOne({
        where: { userId, teamId: context.teamId },
        relations: ['role'],
      });

      if (teamMembership) {
        return {
          role: teamMembership.role.name,
          scope: 'team',
          permissions: teamMembership.role.permissions || [],
        };
      }
    }

    // 3. Проверяем организационную роль
    if (context.organizationId) {
      // Сначала проверяем UserRoleAssignment для организации
      const orgRoleAssignment = user.userRoleAssignments?.find(assignment => 
        assignment.organizationRole && assignment.organizationId === context.organizationId
      );
      
      if (orgRoleAssignment?.organizationRole) {
        return {
          role: orgRoleAssignment.organizationRole.name,
          scope: 'organization',
          permissions: orgRoleAssignment.organizationRole.permissions || [],
        };
      }

      // Затем проверяем через OrganizationMembership
      const orgMembership = await this.orgMembershipRepo.findOne({
        where: { userId, organizationId: context.organizationId },
        relations: ['role'],
      });

      if (orgMembership) {
        return {
          role: orgMembership.role.name,
          scope: 'organization',
          permissions: orgMembership.role.permissions || [],
        };
      }
    }
    
    // 5. Возвращаем глобальную роль
    return {
      role: globalRole?.name || 'viewer',
      scope: 'global',
      permissions: globalRole?.permissions?.map(p => p.name) || [],
    };
  }

  /**
   * Получить уровень роли
   */
  getRoleLevel(roleName: string): number {
    const ROLE_LEVELS: Record<string, number> = {
      super_admin: 100,
      admin: 80,
      manager: 60,
      editor: 40,
      viewer: 20,
    };

    return ROLE_LEVELS[roleName] || 0;
  }

  /**
   * Проверить, может ли пользователь управлять другим пользователем
   * Правило: можно управлять если уровень >= (больше или равен)
   */
  async canManageUser(
    managerId: string,
    targetUserId: string,
    context: UserRoleContext = {},
  ): Promise<boolean> {
    // Получаем эффективные роли обоих пользователей в контексте
    const managerRole = await this.getUserEffectiveRole(managerId, context);
    const targetRole = await this.getUserEffectiveRole(targetUserId, context);

    // Получаем уровни ролей
    const managerLevel = this.getRoleLevel(managerRole.role);
    const targetLevel = this.getRoleLevel(targetRole.role);

    // Может управлять если уровень больше или равен
    return managerLevel >= targetLevel;
  }

  /**
   * Проверить, может ли пользователь создавать команды
   */
  async canCreateTeams(userId: string, organizationId: string): Promise<boolean> {
    const userRole = await this.getUserEffectiveRole(userId, { organizationId });

    return ['super_admin', 'admin', 'manager'].includes(userRole.role);
  }

  /**
   * Проверить, может ли пользователь приглашать в организацию/команду
   */
  async canInviteUsers(
    userId: string,
    context: UserRoleContext,
  ): Promise<boolean> {
    const userRole = await this.getUserEffectiveRole(userId, context);

    return ['super_admin', 'admin', 'manager'].includes(userRole.role);
  }

  /**
   * Получить все роли пользователя (глобальные + организационные + командные)
   */
  async getAllUserRoles(userId: string): Promise<{
    global: string[];
    organizations: Array<{ organizationId: string; role: string }>;
    teams: Array<{ teamId: string; role: string }>;
  }> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: [
        'userRoleAssignments',
        'userRoleAssignments.role',
        'organizationMemberships',
        'organizationMemberships.role',
        'organizationMemberships.organization',
        'teamMemberships',
        'teamMemberships.role',
        'teamMemberships.team',
      ],
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      global: user.userRoleAssignments?.map(assignment => {
        if (assignment.role) return assignment.role.name;
        if (assignment.organizationRole) return assignment.organizationRole.name;
        if (assignment.teamRole) return assignment.teamRole.name;
        return null;
      }).filter((name): name is string => Boolean(name)) || [],
      organizations: user.organizationMemberships?.map(membership => ({
        organizationId: membership.organizationId,
        role: membership.role.name,
      })) || [],
      teams: user.teamMemberships?.map(membership => ({
        teamId: membership.teamId,
        role: membership.role.name,
      })) || [],
    };
  }

  /**
   * Получить доступные роли для приглашения
   * Правило: можно приглашать с ролями <= (меньше или равно) своей роли
   */
  async getAvailableRolesForInvite(
    userId: string,
    context: UserRoleContext,
    allRoles: Array<{ name: string; level: number; id: string; description: string }>,
  ): Promise<Array<{ name: string; level: number; id: string; description: string }>> {
    console.log(`🔍 [RoleHierarchyService] getAvailableRolesForInvite called for user ${userId}, context:`, context);
    console.log(`🔍 [RoleHierarchyService] Total roles to filter: ${allRoles.length}`);
    
    // Получаем эффективную роль пользователя в контексте
    const userRole = await this.getUserEffectiveRole(userId, context);
    const userLevel = this.getRoleLevel(userRole.role);
    
    console.log(`🔍 [RoleHierarchyService] User effective role: ${userRole.role}, level: ${userLevel}`);

    // Для super_admin возвращаем все роли независимо от уровня
    if (userRole.role === 'super_admin') {
      console.log(`✅ [RoleHierarchyService] User is super_admin, returning all ${allRoles.length} roles`);
      return allRoles;
    }

    // Фильтруем роли: только те, у которых level <= userLevel
    const filtered = allRoles.filter(role => role.level <= userLevel);
    console.log(`🔍 [RoleHierarchyService] Filtered roles: ${filtered.length} (userLevel: ${userLevel})`);
    return filtered;
  }
}