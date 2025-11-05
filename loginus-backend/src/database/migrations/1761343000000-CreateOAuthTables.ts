import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOAuthTables1761343000000 implements MigrationInterface {
  name = 'CreateOAuthTables1761343000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем таблицу oauth_clients
    const oauthClientsTableExists = await queryRunner.hasTable('oauth_clients');
    if (!oauthClientsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'oauth_clients',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'clientId',
              type: 'varchar',
              length: '255',
              isUnique: true,
            },
            {
              name: 'clientSecret',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'redirectUris',
              type: 'text',
              isArray: true,
              default: "'{}'",
            },
            {
              name: 'scopes',
              type: 'text',
              isArray: true,
              default: "'{}'",
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
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

      await queryRunner.createIndex(
        'oauth_clients',
        new TableIndex({
          name: 'IDX_oauth_clients_clientId',
          columnNames: ['clientId'],
        }),
      );
    }

    // Создаем таблицу authorization_codes
    const authorizationCodesTableExists = await queryRunner.hasTable('authorization_codes');
    if (!authorizationCodesTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'authorization_codes',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'code',
              type: 'varchar',
              length: '255',
              isUnique: true,
            },
            {
              name: 'userId',
              type: 'uuid',
            },
            {
              name: 'clientId',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'redirectUri',
              type: 'varchar',
              length: '500',
            },
            {
              name: 'scopes',
              type: 'text',
              isArray: true,
              default: "'{}'",
            },
            {
              name: 'state',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'expiresAt',
              type: 'timestamp',
            },
            {
              name: 'isUsed',
              type: 'boolean',
              default: false,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'NOW()',
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'authorization_codes',
        new TableIndex({
          name: 'IDX_authorization_codes_code',
          columnNames: ['code'],
        }),
      );

      await queryRunner.createIndex(
        'authorization_codes',
        new TableIndex({
          name: 'IDX_authorization_codes_clientId',
          columnNames: ['clientId'],
        }),
      );

      await queryRunner.createIndex(
        'authorization_codes',
        new TableIndex({
          name: 'IDX_authorization_codes_userId',
          columnNames: ['userId'],
        }),
      );

      await queryRunner.createIndex(
        'authorization_codes',
        new TableIndex({
          name: 'IDX_authorization_codes_expiresAt',
          columnNames: ['expiresAt'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индексы
    const authorizationCodesTableExists = await queryRunner.hasTable('authorization_codes');
    if (authorizationCodesTableExists) {
      await queryRunner.dropIndex('authorization_codes', 'IDX_authorization_codes_expiresAt');
      await queryRunner.dropIndex('authorization_codes', 'IDX_authorization_codes_userId');
      await queryRunner.dropIndex('authorization_codes', 'IDX_authorization_codes_clientId');
      await queryRunner.dropIndex('authorization_codes', 'IDX_authorization_codes_code');
      await queryRunner.dropTable('authorization_codes');
    }

    const oauthClientsTableExists = await queryRunner.hasTable('oauth_clients');
    if (oauthClientsTableExists) {
      await queryRunner.dropIndex('oauth_clients', 'IDX_oauth_clients_clientId');
      await queryRunner.dropTable('oauth_clients');
    }
  }
}

