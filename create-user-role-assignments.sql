-- Проверяем, существует ли таблица
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_role_assignments'
    ) THEN
        -- Создаем таблицу
        CREATE TABLE user_role_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "userId" UUID NOT NULL,
            "roleId" UUID,
            "organizationRoleId" UUID,
            "teamRoleId" UUID,
            "organizationId" UUID,
            "teamId" UUID,
            "assignedBy" UUID,
            "expiresAt" TIMESTAMP,
            "createdAt" TIMESTAMP DEFAULT NOW(),
            "updatedAt" TIMESTAMP DEFAULT NOW()
        );

        -- Внешние ключи
        ALTER TABLE user_role_assignments 
        ADD CONSTRAINT "FK_user_role_assignments_user" 
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

        ALTER TABLE user_role_assignments 
        ADD CONSTRAINT "FK_user_role_assignments_global_role" 
        FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

        RAISE NOTICE 'Table user_role_assignments created successfully';
    ELSE
        RAISE NOTICE 'Table user_role_assignments already exists';
    END IF;
END $$;

