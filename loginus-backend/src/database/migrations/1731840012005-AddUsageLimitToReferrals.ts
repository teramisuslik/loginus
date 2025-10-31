import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageLimitToReferrals1731840012005 implements MigrationInterface {
  name = 'AddUsageLimitToReferrals1731840012005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем колонку usage_limit (может быть null для бесконечного использования)
    await queryRunner.query(`
      ALTER TABLE "referrals" 
      ADD COLUMN IF NOT EXISTS "usage_limit" integer NULL
    `);

    // Добавляем колонку usage_count (количество использований)
    await queryRunner.query(`
      ALTER TABLE "referrals" 
      ADD COLUMN IF NOT EXISTS "usage_count" integer NOT NULL DEFAULT 0
    `);

    // Обновляем существующие записи: если isUsed = true, то usageCount = 1
    await queryRunner.query(`
      UPDATE "referrals" 
      SET "usage_count" = 1 
      WHERE "isUsed" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "usage_count"`);
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "usage_limit"`);
  }
}

