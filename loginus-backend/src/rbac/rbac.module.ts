import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacService } from './rbac.service';
import { RoleHierarchyService } from './role-hierarchy.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { UserRoleAssignment } from '../users/entities/user-role-assignment.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { TeamMembership } from '../teams/entities/team-membership.entity';
import { OrganizationRole } from '../organizations/entities/organization-role.entity';
import { TeamRole } from '../teams/entities/team-role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Team } from '../teams/entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, User, UserRoleAssignment, OrganizationMembership, TeamMembership, OrganizationRole, TeamRole, Organization, Team])],
  controllers: [RolesController, PermissionsController],
  providers: [RbacService, RoleHierarchyService],
  exports: [RbacService, RoleHierarchyService],
})
export class RbacModule {}
