import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramAndGitHubToTwoFactorType1731840013001 implements MigrationInterface {
  name = 'AddTelegramAndGitHubToTwoFactorType1731840013001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM создает enum с именем "{table_name}_{column_name}_enum"
    // Для таблицы two_factor_codes и колонки type это будет "two_factor_codes_type_enum"
    
    // Получаем имя enum типа из базы данных
    const enumNameResult = await queryRunner.query(`
      SELECT t.typname as enum_name
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE e.enumlabel = 'email'
      LIMIT 1;
    `);
    
    if (enumNameResult && enumNameResult.length > 0) {
      const enumName = enumNameResult[0].enum_name;
      
      // Добавляем telegram если его нет
      const telegramExists = await queryRunner.query(`
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'telegram' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
      `, [enumName]);
      
      if (!telegramExists || telegramExists.length === 0) {
        await queryRunner.query(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS 'telegram';`);
      }

      // Добавляем github если его нет
      const githubExists = await queryRunner.query(`
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'github' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
      `, [enumName]);
      
      if (!githubExists || githubExists.length === 0) {
        await queryRunner.query(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS 'github';`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаление значений из enum в PostgreSQL невозможно напрямую
    // Можно только пересоздать enum, но это требует удаления зависимостей
    // Оставим как есть - значения останутся, но не будут использоваться
    console.warn('⚠️ Нельзя удалить значения из enum в PostgreSQL без пересоздания таблицы');
  }
}

