-- Проверяем таблицы, связанные с ролями
\dt *role*

-- Проверяем записи в user_roles
SELECT * FROM user_roles WHERE "userId" = '19f8afd6-b52a-4f2c-863b-dabd128c7529';

-- Если таблица называется user_role_assignments
SELECT * FROM user_role_assignments WHERE "userId" = '19f8afd6-b52a-4f2c-863b-dabd128c7529';

