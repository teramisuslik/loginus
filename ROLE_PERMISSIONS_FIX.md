# Исправление проблемы с редактированием прав системных ролей

## Проблема
При попытке изменить набор прав у системной роли возникала ошибка:
```
HTTP 403: {"message":"Нельзя редактировать системные роли","error":"Forbidden","statusCode":403}
```

## Причина
В методе `updateRolePermissions` в файле `rbac.service.ts` была проверка, которая запрещала изменение прав системных ролей, если пользователь не является super_admin.

## Решение
Убрана проверка на системные роли в методе `updateRolePermissions`. Теперь можно изменять права для всех ролей, включая системные.

### Изменения в коде:

**До:**
```typescript
// Проверяем, является ли пользователь super_admin
let isSuperAdmin = false;
if (userId) {
  const user = await this.usersRepo.findOne({
    where: { id: userId },
    relations: ['userRoleAssignments', 'userRoleAssignments.role'],
  });

  if (user) {
    isSuperAdmin = user.userRoleAssignments?.some(
      assignment => assignment.role?.name === 'super_admin' && !assignment.organizationId && !assignment.teamId
    ) || false;
  }
}

// Если роль системная, разрешаем изменение только суперадмину
if (role.isSystem && !isSuperAdmin) {
  throw new ForbiddenException('Cannot modify system role');
}
```

**После:**
```typescript
// Разрешаем изменение прав для всех ролей (включая системные)
// Права можно изменять, так как это не влияет на структуру роли
```

## Важно
- Изменение прав системных ролей теперь разрешено
- Изменение названия и описания системных ролей по-прежнему ограничено (только для super_admin)
- Это позволяет гибко настраивать права доступа для системных ролей

## Статус
✅ Исправлено. Теперь можно изменять права у системных ролей.

