import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeBasePermissions1761344000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем права для базы знаний
    await queryRunner.query(`
      INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
      VALUES 
        -- Категории (Categories)
        ('00000000-0000-0000-0000-000000000700', 'knowledge.categories.read', 'Просмотр категорий', 'knowledge.categories', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000701', 'knowledge.categories.create', 'Создание категорий', 'knowledge.categories', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000702', 'knowledge.categories.update', 'Редактирование категорий', 'knowledge.categories', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000703', 'knowledge.categories.delete', 'Удаление категорий', 'knowledge.categories', 'delete', NOW(), NOW()),
        
        -- Типы (Types)
        ('00000000-0000-0000-0000-000000000800', 'knowledge.types.read', 'Просмотр типов', 'knowledge.types', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000801', 'knowledge.types.create', 'Создание типов', 'knowledge.types', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000802', 'knowledge.types.update', 'Редактирование типов', 'knowledge.types', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000803', 'knowledge.types.delete', 'Удаление типов', 'knowledge.types', 'delete', NOW(), NOW()),
        
        -- Материалы (Items)
        ('00000000-0000-0000-0000-000000000900', 'knowledge.items.read', 'Просмотр материалов', 'knowledge.items', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000901', 'knowledge.items.create', 'Создание материалов', 'knowledge.items', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000902', 'knowledge.items.update', 'Редактирование материалов', 'knowledge.items', 'update', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000903', 'knowledge.items.delete', 'Удаление материалов', 'knowledge.items', 'delete', NOW(), NOW()),
        
        -- Файлы (Files)
        ('00000000-0000-0000-0000-000000001000', 'knowledge.files.read', 'Просмотр и скачивание файлов', 'knowledge.files', 'read', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000001001', 'knowledge.files.create', 'Загрузка файлов', 'knowledge.files', 'create', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000001002', 'knowledge.files.delete', 'Удаление файлов', 'knowledge.files', 'delete', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем добавленные права
    await queryRunner.query(`
      DELETE FROM permissions 
      WHERE id IN (
        '00000000-0000-0000-0000-000000000700',
        '00000000-0000-0000-0000-000000000701',
        '00000000-0000-0000-0000-000000000702',
        '00000000-0000-0000-0000-000000000703',
        '00000000-0000-0000-0000-000000000800',
        '00000000-0000-0000-0000-000000000801',
        '00000000-0000-0000-0000-000000000802',
        '00000000-0000-0000-0000-000000000803',
        '00000000-0000-0000-0000-000000000900',
        '00000000-0000-0000-0000-000000000901',
        '00000000-0000-0000-0000-000000000902',
        '00000000-0000-0000-0000-000000000903',
        '00000000-0000-0000-0000-000000001000',
        '00000000-0000-0000-0000-000000001001',
        '00000000-0000-0000-0000-000000001002'
      );
    `);
  }
}

