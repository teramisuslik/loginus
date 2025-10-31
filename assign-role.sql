INSERT INTO user_roles ("userId", "roleId", "grantedAt")
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.email = 'admin@vselena.ru' AND r.name = 'super_admin'
ON CONFLICT DO NOTHING;

SELECT u.email, r.name as role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur."userId"
LEFT JOIN roles r ON ur."roleId" = r.id
WHERE u.email = 'admin@vselena.ru';

