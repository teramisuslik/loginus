-- Получение данных пользователя saschkaproshka04@mail.ru

-- Базовая информация
SELECT 
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u.phone,
  u."emailVerified",
  u."phoneVerified",
  u."createdAt"
FROM users u 
WHERE u.email = 'saschkaproshka04@mail.ru';

-- Организации через organization_memberships
SELECT 
  o.id as org_id,
  o.name as org_name,
  or2.name as role_name,
  or2.permissions as role_permissions,
  om."joinedAt"
FROM organization_memberships om
JOIN organizations o ON om."organizationId" = o.id
JOIN organization_roles or2 ON om."roleId" = or2.id
WHERE om."userId" = (SELECT id FROM users WHERE email = 'saschkaproshka04@mail.ru');

-- Глобальные роли
SELECT 
  r.name as role_name,
  r."isGlobal",
  r."isSystem"
FROM user_role_assignments ura
LEFT JOIN roles r ON ura."roleId" = r.id
WHERE ura."userId" = (SELECT id FROM users WHERE email = 'saschkaproshka04@mail.ru')
  AND ura."organizationId" IS NULL 
  AND ura."teamId" IS NULL;

-- Роли организаций через user_role_assignments
SELECT 
  o.name as org_name,
  or2.name as role_name,
  or2.permissions
FROM user_role_assignments ura
JOIN organizations o ON ura."organizationId" = o.id
JOIN organization_roles or2 ON ura."organizationRoleId" = or2.id
WHERE ura."userId" = (SELECT id FROM users WHERE email = 'saschkaproshka04@mail.ru')
  AND ura."organizationId" IS NOT NULL;

