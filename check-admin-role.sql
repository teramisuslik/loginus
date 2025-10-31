-- Проверяем роль пользователя admin@loginus.ru
SELECT 
    u.id,
    u.email, 
    u."firstName", 
    u."lastName", 
    r.name as role_name, 
    r."isGlobal",
    ur."userId" as user_roles_userId,
    ur."roleId" as user_roles_roleId
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur."userId" 
LEFT JOIN roles r ON ur."roleId" = r.id 
WHERE u.email = 'admin@loginus.ru';

-- Проверяем саму запись в user_roles
SELECT * FROM user_roles WHERE "userId" = (SELECT id FROM users WHERE email = 'admin@loginus.ru');

-- Проверяем роль super_admin
SELECT * FROM roles WHERE name = 'super_admin';

