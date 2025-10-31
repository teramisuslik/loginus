import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePermissions1761342000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем базовые права
    await queryRunner.query(`
      INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
      VALUES 
        -- Пользователи
        ('00000000-0000-0000-0000-000000000100', 'users.create', 'Создание пользователей', 'users', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000101', 'users.read', 'Просмотр пользователей', 'users', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000102', 'users.update', 'Редактирование пользователей', 'users', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000103', 'users.delete', 'Удаление пользователей', 'users', 'delete', NOW(), NOW()),
        
        -- Роли
        ('00000000-0000-0000-0000-000000000200', 'roles.create', 'Создание ролей', 'roles', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000201', 'roles.read', 'Просмотр ролей', 'roles', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000202', 'roles.update', 'Редактирование ролей', 'roles', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000203', 'roles.delete', 'Удаление ролей', 'roles', 'delete', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000204', 'roles.assign', 'Назначение ролей', 'roles', 'assign', NOW(), NOW()),
        
        -- Права
        ('00000000-0000-0000-0000-000000000300', 'permissions.create', 'Создание прав', 'permissions', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000301', 'permissions.read', 'Просмотр прав', 'permissions', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000302', 'permissions.update', 'Редактирование прав', 'permissions', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000303', 'permissions.delete', 'Удаление прав', 'permissions', 'delete', NOW(), NOW()),
        
        -- Организации
        ('00000000-0000-0000-0000-000000000400', 'organizations.create', 'Создание организаций', 'organizations', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000401', 'organizations.read', 'Просмотр организаций', 'organizations', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000402', 'organizations.update', 'Редактирование организаций', 'organizations', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000403', 'organizations.delete', 'Удаление организаций', 'organizations', 'delete', NOW(), NOW()),
        
        -- Команды
        ('00000000-0000-0000-0000-000000000500', 'teams.create', 'Создание команд', 'teams', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000501', 'teams.read', 'Просмотр команд', 'teams', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000502', 'teams.update', 'Редактирование команд', 'teams', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000503', 'teams.delete', 'Удаление команд', 'teams', 'delete', NOW(), NOW()),
        
        -- Система
        ('00000000-0000-0000-0000-000000000600', 'system.settings', 'Настройки системы', 'system', 'settings', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000601', 'system.logs', 'Просмотр логов', 'system', 'logs', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000602', 'system.backup', 'Резервное копирование', 'system', 'backup', NOW(), NOW());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем все созданные права
    await queryRunner.query(`
      DELETE FROM permissions WHERE id LIKE '00000000-0000-0000-0000-000000000%';
    `);
  }
}
