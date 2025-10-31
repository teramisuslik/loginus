import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteAllUsersExceptNewSuperAdmin1761342000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Удаляем всех пользователей кроме нового суперадмина
    await queryRunner.query(`
      DELETE FROM user_role_assignments 
      WHERE "userId" != (SELECT id FROM users WHERE email = 'aadmin@logunus.ru');
    `);
    
    await queryRunner.query(`
      DELETE FROM users 
      WHERE email != 'aadmin@logunus.ru';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откат не предусмотрен, так как это операция очистки
    console.log('Rollback not supported for user deletion');
  }
}
