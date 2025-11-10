-- Синхронизация всех organization_roles с системными ролями из таблицы roles

-- Обновление super_admin
UPDATE organization_roles
SET permissions = to_jsonb(ARRAY[
  'knowledge.categories.create',
  'knowledge.categories.delete',
  'knowledge.categories.read',
  'knowledge.categories.update',
  'organizations.create',
  'organizations.delete',
  'organizations.read',
  'organizations.update',
  'permissions.create',
  'permissions.delete',
  'permissions.read',
  'permissions.update',
  'roles.assign',
  'roles.create',
  'roles.delete',
  'roles.read',
  'roles.update',
  'system.backup',
  'system.logs',
  'system.settings',
  'teams.create',
  'teams.delete',
  'teams.read',
  'teams.update',
  'users.create',
  'users.delete',
  'users.read',
  'users.update'
])
WHERE name = 'super_admin' AND "isSystem" = true;

-- Обновление admin
UPDATE organization_roles
SET permissions = to_jsonb(ARRAY[
  'organizations.create',
  'organizations.delete',
  'organizations.read',
  'organizations.update',
  'permissions.create',
  'permissions.delete',
  'permissions.read',
  'permissions.update',
  'roles.assign',
  'roles.create',
  'roles.delete',
  'roles.read',
  'roles.update',
  'teams.create',
  'teams.delete',
  'teams.read',
  'teams.update',
  'users.create',
  'users.delete',
  'users.read',
  'users.update'
])
WHERE name = 'admin' AND "isSystem" = true;

-- Обновление manager
UPDATE organization_roles
SET permissions = to_jsonb(ARRAY[
  'organizations.create',
  'organizations.read',
  'organizations.update',
  'teams.create',
  'teams.read',
  'teams.update',
  'users.create',
  'users.read',
  'users.update'
])
WHERE name = 'manager' AND "isSystem" = true;

-- Обновление editor
UPDATE organization_roles
SET permissions = to_jsonb(ARRAY[
  'organizations.read',
  'teams.read',
  'users.read'
])
WHERE name = 'editor' AND "isSystem" = true;

-- Обновление viewer
UPDATE organization_roles
SET permissions = to_jsonb(ARRAY[
  'organizations.read',
  'permissions.read',
  'roles.read',
  'teams.read',
  'users.read'
])
WHERE name = 'viewer' AND "isSystem" = true;

-- Проверка результата
SELECT 
  name,
  COUNT(*) as count,
  permissions
FROM organization_roles
WHERE "isSystem" = true
GROUP BY name, permissions
ORDER BY name;

