-- Проверяем роли пользователя
SELECT u.email, r.name as role 
FROM users u 
LEFT JOIN user_role_assignments ura ON u.id = ura."userId" 
LEFT JOIN roles r ON ura."roleId" = r.id 
WHERE u.email = 'admin@vselena.ru';
