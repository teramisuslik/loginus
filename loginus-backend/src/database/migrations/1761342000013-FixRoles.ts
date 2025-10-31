import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRoles1761342000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Удаляем старые роли
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('user');
    `);
    
    // Обновляем существующие роли
    await queryRunner.query(`
      UPDATE roles SET 
        name = 'manager',
        description = 'Менеджер'
      WHERE name = 'admin';
    `);
    
    // Добавляем недостающие роли
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, "organizationId", "teamId", "isSystem", "isGlobal", "createdAt", "updatedAt")
      VALUES 
        ('00000000-0000-0000-0000-000000000014', 'admin', 'Администратор', null, null, true, true, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000015', 'editor', 'Редактор', null, null, true, true, NOW(), NOW())
;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем старые роли
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('manager', 'editor');
    `);
    
    await queryRunner.query(`
      UPDATE roles SET 
        name = 'admin',
        description = 'Администратор'
      WHERE name = 'manager';
    `);
    
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, "organizationId", "teamId", "isSystem", "isGlobal", "createdAt", "updatedAt")
      VALUES 
        ('00000000-0000-0000-0000-000000000012', 'user', 'Обычный пользователь', null, null, true, true, NOW(), NOW());
    `);
  }
}
