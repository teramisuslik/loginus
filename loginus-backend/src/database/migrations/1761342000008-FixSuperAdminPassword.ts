import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSuperAdminPassword1761342000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Обновляем пароль суперадмина на правильный хеш для "admin123"
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ'
      WHERE email = 'admin@loginus.ru';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем старый хеш
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ'
      WHERE email = 'admin@loginus.ru';
    `);
  }
}
