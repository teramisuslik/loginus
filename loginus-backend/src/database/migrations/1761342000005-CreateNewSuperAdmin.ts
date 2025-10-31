import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewSuperAdmin1761342000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем нового супер-админа с правильным хешем для пароля "admin123"
    await queryRunner.query(`
      INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", "isActive", "emailVerified", "createdAt", "updatedAt")
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'admin@loginus.ru',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ',
        'Новый',
        'Админ',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    // Назначаем роль super_admin новому пользователю
    await queryRunner.query(`
      INSERT INTO user_role_assignments ("userId", "roleId", "organizationId", "teamId", "assignedBy", "createdAt", "updatedAt")
      SELECT 
        '00000000-0000-0000-0000-000000000002',
        r.id,
        null,
        null,
        '00000000-0000-0000-0000-000000000002',
        NOW(),
        NOW()
      FROM roles r 
      WHERE r.name = 'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM user_role_assignments ura 
        WHERE ura."userId" = '00000000-0000-0000-0000-000000000002' 
        AND ura."roleId" = r.id
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем нового супер-админа
    await queryRunner.query(`
      DELETE FROM user_role_assignments WHERE "userId" = '00000000-0000-0000-0000-000000000002';
    `);
    
    await queryRunner.query(`
      DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000002';
    `);
  }
}
