// Скрипт для синхронизации ролей manager и super_admin
// Запускается через docker exec в контейнере backend

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { RbacService } = require('./dist/rbac/rbac.service');

async function syncRoles() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const rbacService = app.get(RbacService);
  
  console.log('🔄 Начинаю синхронизацию ролей manager и super_admin...');
  
  try {
    // Получаем текущие права ролей и запускаем синхронизацию
    // Это вызовет syncGlobalRoleToOrganizations и syncGlobalRoleToTeams
    const roles = ['manager', 'super_admin'];
    
    for (const roleName of roles) {
      console.log(`\n📋 Синхронизация роли: ${roleName}`);
      
      // Получаем роль с правами
      const role = await rbacService.getRoleByName(roleName);
      if (!role) {
        console.log(`⚠️ Роль ${roleName} не найдена`);
        continue;
      }
      
      // Вызываем синхронизацию через обновление прав (даже если они не изменились)
      // Это запустит syncGlobalRoleToOrganizations и syncGlobalRoleToTeams
      const roleWithPermissions = await rbacService.getRoleById(role.id);
      const permissionIds = roleWithPermissions.permissions?.map(p => p.id) || [];
      
      await rbacService.updateRolePermissions(role.id, permissionIds);
      console.log(`✅ Роль ${roleName} синхронизирована`);
    }
    
    console.log('\n✅ Синхронизация завершена');
  } catch (error) {
    console.error('❌ Ошибка при синхронизации:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

syncRoles();

