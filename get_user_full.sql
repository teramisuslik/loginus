-- Права из глобальной роли viewer
SELECT p.id, p.name, p.resource, p.action 
FROM permissions p 
JOIN role_permissions rp ON p.id = rp."permissionId" 
JOIN roles r ON rp."roleId" = r.id 
WHERE r.name = 'viewer' 
ORDER BY p.resource, p.action;

-- Права организации (из массива permissions)
SELECT p.id, p.name, p.resource, p.action 
FROM permissions p 
WHERE p.name IN ('teams.manage', 'users.invite', 'users.manage') 
ORDER BY p.resource, p.action;

-- Команды
SELECT tm.id, t.id as team_id, t.name as team_name, tr.name as role_name, tr.permissions 
FROM team_memberships tm 
JOIN teams t ON tm."teamId" = t.id 
JOIN team_roles tr ON tm."roleId" = tr.id 
WHERE tm."userId" = (SELECT id FROM users WHERE email = 'saschkaproshka04@mail.ru');

