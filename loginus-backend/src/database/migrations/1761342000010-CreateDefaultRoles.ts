import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDefaultRoles1761342000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем роли по умолчанию
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, "organizationId", "teamId", "isSystem", "isGlobal", "createdAt", "updatedAt")
      VALUES 
        ('00000000-0000-0000-0000-000000000010', 'super_admin', 'Супер администратор системы', null, null, true, true, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000011', 'admin', 'Администратор', null, null, true, true, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000012', 'user', 'Обычный пользователь', null, null, true, true, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000013', 'viewer', 'Просмотрщик', null, null, true, true, NOW(), NOW())
;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем роли
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('super_admin', 'admin', 'user', 'viewer');
    `);
  }
}
