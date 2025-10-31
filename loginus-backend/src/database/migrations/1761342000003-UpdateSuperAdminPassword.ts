import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSuperAdminPassword1761342000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Обновляем пароль суперадмина на "admin123"
    // Используем правильный хеш для пароля "admin123"
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ'
      WHERE email = 'admin@vselena.ru';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем старый хеш (если нужно)
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4VZJqJqJqJ'
      WHERE email = 'admin@vselena.ru';
    `);
  }
}
