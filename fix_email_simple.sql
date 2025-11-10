-- Простое исправление: удаляем EMAIL из availableAuthMethods, если email пустой
UPDATE "user"
SET "availableAuthMethods" = array_remove("availableAuthMethods", 'EMAIL')
WHERE 'EMAIL' = ANY("availableAuthMethods")
AND (email IS NULL OR email = '' OR email = 'null');

-- Показываем результат
SELECT id, email, "availableAuthMethods", "firstName", "lastName"
FROM "user"
WHERE 'EMAIL' = ANY("availableAuthMethods")
AND (email IS NULL OR email = '' OR email = 'null');
