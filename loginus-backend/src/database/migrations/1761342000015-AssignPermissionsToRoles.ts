import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignPermissionsToRoles1761342000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Назначаем права роли super_admin (все права)
    await queryRunner.query(`
      INSERT INTO role_permissions ("roleId", "permissionId", "grantedBy", "grantedAt")
      SELECT 
        r.id,
        p.id,
        r.id,
        NOW()
      FROM roles r, permissions p
      WHERE r.name = 'super_admin';
    `);
    
    // Назначаем права роли admin (все кроме системных)
    await queryRunner.query(`
      INSERT INTO role_permissions ("roleId", "permissionId", "grantedBy", "grantedAt")
      SELECT 
        r.id,
        p.id,
        r.id,
        NOW()
      FROM roles r, permissions p
      WHERE r.name = 'admin' 
      AND p.resource != 'system';
    `);
    
    // Назначаем права роли manager (пользователи, организации, команды - только чтение и создание)
    await queryRunner.query(`
      INSERT INTO role_permissions ("roleId", "permissionId", "grantedBy", "grantedAt")
      SELECT 
        r.id,
        p.id,
        r.id,
        NOW()
      FROM roles r, permissions p
      WHERE r.name = 'manager' 
      AND (
        (p.resource = 'users' AND p.action IN ('read', 'create', 'update')) OR
        (p.resource = 'organizations' AND p.action IN ('read', 'create', 'update')) OR
        (p.resource = 'teams' AND p.action IN ('read', 'create', 'update'))
      );
    `);
    
    // Назначаем права роли editor (только чтение и редактирование контента)
    await queryRunner.query(`
      INSERT INTO role_permissions ("roleId", "permissionId", "grantedBy", "grantedAt")
      SELECT 
        r.id,
        p.id,
        r.id,
        NOW()
      FROM roles r, permissions p
      WHERE r.name = 'editor' 
      AND (
        (p.resource = 'users' AND p.action = 'read') OR
        (p.resource = 'organizations' AND p.action = 'read') OR
        (p.resource = 'teams' AND p.action = 'read')
      );
    `);
    
    // Назначаем права роли viewer (только чтение)
    await queryRunner.query(`
      INSERT INTO role_permissions ("roleId", "permissionId", "grantedBy", "grantedAt")
      SELECT 
        r.id,
        p.id,
        r.id,
        NOW()
      FROM roles r, permissions p
      WHERE r.name = 'viewer' 
      AND p.action = 'read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем все назначения прав
    await queryRunner.query(`
      DELETE FROM role_permissions;
    `);
  }
}
