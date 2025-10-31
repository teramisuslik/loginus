-- Удаляем из старой таблицы user_roles
DELETE FROM user_roles WHERE "userId" = '19f8afd6-b52a-4f2c-863b-dabd128c7529';

-- Вставляем в правильную таблицу user_role_assignments
INSERT INTO user_role_assignments ("userId", "roleId", "assignedBy")
VALUES (
    '19f8afd6-b52a-4f2c-863b-dabd128c7529',
    '00000000-0000-0000-0000-000000000001',
    '19f8afd6-b52a-4f2c-863b-dabd128c7529'
);

-- Проверяем результат
SELECT * FROM user_role_assignments WHERE "userId" = '19f8afd6-b52a-4f2c-863b-dabd128c7529';

-- Проверяем с JOIN
SELECT 
    ura.id, 
    ura."userId", 
    ura."roleId",
    r.name as role_name,
    r."isGlobal"
FROM user_role_assignments ura
JOIN roles r ON r.id = ura."roleId"
WHERE ura."userId" = '19f8afd6-b52a-4f2c-863b-dabd128c7529';

