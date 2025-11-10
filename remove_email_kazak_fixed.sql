-- Удаляем EMAIL из availableAuthMethods для пользователя Kazak
-- availableAuthMethods имеет тип jsonb (массив), поэтому используем jsonb_array_elements
UPDATE users
SET "availableAuthMethods" = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements_text("availableAuthMethods") elem
    WHERE elem != 'EMAIL'
)::jsonb
WHERE 
    ("firstName" ILIKE '%Kazak%' OR "lastName" ILIKE '%Kazak%' OR email ILIKE '%kazak%')
    AND "availableAuthMethods"::jsonb @> '"EMAIL"'::jsonb;

-- Показываем результат
SELECT id, email, "firstName", "lastName", "availableAuthMethods"
FROM users
WHERE "firstName" ILIKE '%Kazak%' OR "lastName" ILIKE '%Kazak%' OR email ILIKE '%kazak%';

