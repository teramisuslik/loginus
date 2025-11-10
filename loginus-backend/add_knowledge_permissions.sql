-- Добавление прав для knowledge.categories в таблицу permissions
INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000700', 'knowledge.categories.read', 'Просмотр категорий', 'knowledge.categories', 'read', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000701', 'knowledge.categories.create', 'Создание категорий', 'knowledge.categories', 'create', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000702', 'knowledge.categories.update', 'Редактирование категорий', 'knowledge.categories', 'update', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000703', 'knowledge.categories.delete', 'Удаление категорий', 'knowledge.categories', 'delete', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

