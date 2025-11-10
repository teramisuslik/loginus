-- Скрипт для исправления проблемы с отвязкой EMAIL
-- Проблема: availableAuthMethods содержит EMAIL, но email поле NULL или пустое

-- 1. Найдем пользователя "Kazak" и проверим его состояние
SELECT 
    id,
    email,
    "availableAuthMethods",
    "githubId",
    phone,
    "messengerMetadata"->'telegram'->>'userId' as telegram_user_id
FROM "user"
WHERE 
    "firstName" ILIKE '%Kazak%' 
    OR "lastName" ILIKE '%Kazak%'
    OR email ILIKE '%kazak%'
    OR id::text = 'Kazak'  -- если Kazak это ID
ORDER BY "createdAt" DESC
LIMIT 5;

-- 2. Найдем всех пользователей, у которых EMAIL в availableAuthMethods, но email NULL или пустой
SELECT 
    id,
    email,
    "availableAuthMethods",
    "firstName",
    "lastName"
FROM "user"
WHERE 
    'EMAIL' = ANY("availableAuthMethods")
    AND (email IS NULL OR email = '' OR email = 'null')
LIMIT 10;

-- 3. ИСПРАВЛЕНИЕ: Удалим EMAIL из availableAuthMethods, если email поле пустое
-- ВАЖНО: Замените 'USER_ID_HERE' на реальный ID пользователя из шага 1
UPDATE "user"
SET "availableAuthMethods" = array_remove("availableAuthMethods", 'EMAIL')
WHERE 
    id = 'USER_ID_HERE'  -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID
    AND 'EMAIL' = ANY("availableAuthMethods")
    AND (email IS NULL OR email = '' OR email = 'null');

-- 4. Альтернативное исправление: Если email должен быть, но его нет - добавим псевдо-email
-- (используйте только если уверены, что email должен быть)
-- UPDATE "user"
-- SET email = COALESCE(email, 'user_' || id || '@local.temp')
-- WHERE 
--     id = 'USER_ID_HERE'
--     AND 'EMAIL' = ANY("availableAuthMethods")
--     AND (email IS NULL OR email = '');

-- 5. Проверка после исправления
SELECT 
    id,
    email,
    "availableAuthMethods"
FROM "user"
WHERE id = 'USER_ID_HERE';  -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID


