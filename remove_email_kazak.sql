-- Удаляем EMAIL из availableAuthMethods для пользователя Kazak
UPDATE users
SET "availableAuthMethods" = array_remove("availableAuthMethods", 'EMAIL')
WHERE 
    ("firstName" ILIKE '%Kazak%' OR "lastName" ILIKE '%Kazak%' OR email ILIKE '%kazak%')
    AND 'EMAIL' = ANY("availableAuthMethods");

-- Показываем результат
SELECT id, email, "firstName", "lastName", "availableAuthMethods"
FROM users
WHERE "firstName" ILIKE '%Kazak%' OR "lastName" ILIKE '%Kazak%' OR email ILIKE '%kazak%';

