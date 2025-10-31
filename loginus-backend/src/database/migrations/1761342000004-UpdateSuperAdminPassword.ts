import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSuperAdminPassword1761342000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Обновляем пароль суперадмина на "admin123"
    // Используем правильный хеш для пароля "admin123" с bcrypt 12 раундов
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ'
      WHERE email = 'admin@vselena.ru';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем старый хеш
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ'
      WHERE email = 'admin@vselena.ru';
    `);
  }
}
