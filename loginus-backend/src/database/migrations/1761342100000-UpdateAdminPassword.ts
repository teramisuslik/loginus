import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class UpdateAdminPassword1761342100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Генерируем хеш для пароля admin123
    const password = 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Обновляем пароль суперадмина
    await queryRunner.query(`
      UPDATE users 
      SET "passwordHash" = $1
      WHERE email = 'admin@loginus.ru';
    `, [passwordHash]);

    console.log(`✅ Пароль суперадмина admin@loginus.ru обновлен`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Возвращаем старый хеш (нельзя восстановить, поэтому просто логируем)
    console.log(`⚠️ Нельзя восстановить старый пароль, нужно установить новый`);
  }
}

