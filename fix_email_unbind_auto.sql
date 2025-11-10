-- Автоматическое исправление проблемы с отвязкой EMAIL для пользователя Kazak
-- Проблема: availableAuthMethods содержит EMAIL, но email поле NULL или пустое

-- Шаг 1: Найдем пользователя Kazak
DO $$
DECLARE
    user_record RECORD;
    user_id_found UUID;
BEGIN
    -- Ищем пользователя по имени Kazak
    SELECT id, email, "availableAuthMethods" 
    INTO user_record
    FROM "user"
    WHERE 
        ("firstName" ILIKE '%Kazak%' OR "lastName" ILIKE '%Kazak%' OR email ILIKE '%kazak%')
        AND 'EMAIL' = ANY("availableAuthMethods")
        AND (email IS NULL OR email = '' OR email = 'null')
    LIMIT 1;
    
    IF user_record IS NULL THEN
        RAISE NOTICE 'Пользователь Kazak с проблемой не найден. Проверяем всех пользователей с этой проблемой...';
        
        -- Ищем любого пользователя с этой проблемой
        SELECT id, email, "availableAuthMethods" 
        INTO user_record
        FROM "user"
        WHERE 
            'EMAIL' = ANY("availableAuthMethods")
            AND (email IS NULL OR email = '' OR email = 'null')
        LIMIT 1;
    END IF;
    
    IF user_record IS NOT NULL THEN
        user_id_found := user_record.id;
        RAISE NOTICE 'Найден пользователь с ID: %, email: %, methods: %', 
            user_id_found, 
            user_record.email, 
            user_record."availableAuthMethods";
        
        -- Исправляем: удаляем EMAIL из availableAuthMethods
        UPDATE "user"
        SET "availableAuthMethods" = array_remove("availableAuthMethods", 'EMAIL')
        WHERE id = user_id_found;
        
        RAISE NOTICE '✅ Исправлено: EMAIL удален из availableAuthMethods для пользователя %', user_id_found;
        
        -- Проверяем результат
        SELECT email, "availableAuthMethods" 
        INTO user_record
        FROM "user"
        WHERE id = user_id_found;
        
        RAISE NOTICE 'Результат: email = %, methods = %', user_record.email, user_record."availableAuthMethods";
    ELSE
        RAISE NOTICE '❌ Пользователи с этой проблемой не найдены';
    END IF;
END $$;

-- Шаг 2: Показываем всех пользователей с этой проблемой (для информации)
SELECT 
    id,
    email,
    "firstName",
    "lastName",
    "availableAuthMethods"
FROM "user"
WHERE 
    'EMAIL' = ANY("availableAuthMethods")
    AND (email IS NULL OR email = '' OR email = 'null');


