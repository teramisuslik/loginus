-- Назначаем роль super_admin пользователю admin@vselena.ru
DO $$
DECLARE
    v_user_id uuid;
    v_role_id uuid;
BEGIN
    -- Находим ID пользователя
    SELECT id INTO v_user_id FROM users WHERE email = 'admin@vselena.ru';
    
    -- Находим ID роли super_admin
    SELECT id INTO v_role_id FROM roles WHERE name = 'super_admin';
    
    -- Вставляем связь (если еще не существует)
    INSERT INTO user_role_assignments (id, "userId", "roleId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_user_id, v_role_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Role super_admin assigned to admin@vselena.ru';
END $$;

-- Проверяем
SELECT u.email, r.name as role 
FROM users u 
LEFT JOIN user_role_assignments ura ON u.id = ura."userId" 
LEFT JOIN roles r ON ura."roleId" = r.id 
WHERE u.email = 'admin@vselena.ru';

