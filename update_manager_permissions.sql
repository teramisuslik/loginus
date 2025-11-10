-- Обновление прав роли manager в organization_roles
-- Берем права из системной глобальной роли manager

UPDATE organization_roles
SET permissions = ARRAY[
  'organizations.create',
  'organizations.read',
  'organizations.update',
  'teams.create',
  'teams.read',
  'teams.update',
  'users.create',
  'users.read',
  'users.update'
]
WHERE name = 'manager';

-- Проверяем результат
SELECT 
  id,
  name,
  "organizationId",
  permissions,
  "isSystem"
FROM organization_roles
WHERE name = 'manager'
LIMIT 5;

