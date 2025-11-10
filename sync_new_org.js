// Скрипт для синхронизации ролей в новой организации
// Запускается через docker exec в контейнере backend

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { RbacService } = require('./dist/rbac/rbac.service');

async function syncNewOrg() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const rbacService = app.get(RbacService);
  
  const orgId = 'e6d5573c-8436-48b4-a59f-711e23469e36';
  const roleNames = ['admin', 'editor', 'manager', 'super_admin', 'viewer'];
  
  console.log(`🔄 Синхронизация ролей для организации ${orgId}...`);
  
  for (const roleName of roleNames) {
    try {
      // Получаем глобальную роль
      const globalRole = await rbacService.findRoleByName(roleName);
      if (!globalRole) {
        console.log(`⚠️ Глобальная роль ${roleName} не найдена`);
        continue;
      }
      
      // Получаем роль с правами
      const roleWithPermissions = await rbacService.getRoleById(globalRole.id);
      const permissionIds = roleWithPermissions.permissions?.map(p => p.id) || [];
      
      console.log(`📋 Синхронизация роли ${roleName} (${permissionIds.length} прав)...`);
      
      // Обновляем права - это автоматически запустит синхронизацию
      await rbacService.updateRolePermissions(globalRole.id, permissionIds);
      
      console.log(`✅ Роль ${roleName} синхронизирована`);
    } catch (error) {
      console.error(`❌ Ошибка при синхронизации роли ${roleName}:`, error.message);
    }
  }
  
  console.log('\n✅ Синхронизация завершена');
  await app.close();
  process.exit(0);
}

syncNewOrg();

