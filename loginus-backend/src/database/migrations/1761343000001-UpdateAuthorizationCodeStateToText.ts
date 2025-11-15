import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateAuthorizationCodeStateToText1761343000001 implements MigrationInterface {
  name = 'UpdateAuthorizationCodeStateToText1761343000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Изменяем тип поля state с varchar(255) на text
    await queryRunner.changeColumn(
      'authorization_codes',
      'state',
      new TableColumn({
        name: 'state',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откатываем изменение обратно на varchar(255)
    await queryRunner.changeColumn(
      'authorization_codes',
      'state',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }
}

