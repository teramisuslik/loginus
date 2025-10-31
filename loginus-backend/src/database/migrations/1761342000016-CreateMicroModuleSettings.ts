import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMicroModuleSettings1761342000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'micro_module_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'moduleName',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // Вставляем настройки по умолчанию для всех микромодулей
    await queryRunner.query(`
      INSERT INTO micro_module_settings ("moduleName", "isEnabled", "config", "createdAt", "updatedAt")
      VALUES 
        ('email-auth', true, '{"isSystem": true}', NOW(), NOW()),
        ('github-auth', true, '{"isSystem": false}', NOW(), NOW()),
        ('telegram-auth', true, '{"isSystem": false}', NOW(), NOW()),
        ('referral-system', true, '{"isSystem": false}', NOW(), NOW())
      ON CONFLICT ("moduleName") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('micro_module_settings');
  }
}
