# Сообщение для разработчика SV_ERP_Backend

## Исправление передачи прав пользователя

Была исправлена проблема с неполной передачей прав пользователя через OAuth API `/oauth/userinfo` и изменена структура ответа.

### Что было исправлено:

**Проблема 1:** При запросе прав пользователя (например, менеджера организации) отображалось только 5 прав вместо 9.

**Причина:** Метод `getUserInfo` не учитывал права из `userRoleAssignments.organizationRole` и `userRoleAssignments.teamRole`.

**Проблема 2:** Все права передавались в одной куче в поле `allPermissions`, что не позволяло различать права конкретной организации от других прав.

**Решение:**
1. Добавлен сбор прав из всех источников:
   - ✅ Глобальные роли (`userRoleAssignments.role`)
   - ✅ Роли организаций через `organizationMemberships`
   - ✅ Роли команд через `teamMemberships`
   - ✅ **Роли организаций через `userRoleAssignments.organizationRole`** (новое)
   - ✅ **Роли команд через `userRoleAssignments.teamRole`** (новое)

2. **Изменена структура ответа:** Права теперь разделены по источникам:
   - **Права организаций** - в `organizations[].role.permissions` (права конкретной организации)
   - **Права команд** - в `teams[].role.permissions` (права конкретной команды)
   - **Глобальные права** - в `globalRoles[].permissions` (права глобальных ролей)
   - **Поле `allPermissions` удалено** - используйте соответствующий источник в зависимости от контекста

### Результат:

Теперь API `/oauth/userinfo` возвращает **все права пользователя**, разделенные по источникам. Каждая организация и команда содержит свои права отдельно, что позволяет точно определять, какие права действуют в конкретном контексте.

### OAuth Credentials:

Ваши учетные данные для подключения к Loginus:

```
LOGINUS_CLIENT_ID=ad829ce93adefd15b0804e88e150062c
LOGINUS_CLIENT_SECRET=399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254
```

**Redirect URIs (зарегистрированы):**
- `http://localhost:4000/api/auth/callback`
- `http://localhost:3000/auth/callback`

### Проверка:

Проверьте запрос прав пользователя через `/oauth/userinfo`:
- Теперь должно возвращаться **все 9 прав** вместо 5
- Права разделены по источникам: `organizations[].role.permissions`, `teams[].role.permissions`, `globalRoles[].permissions`

### Пример использования:

```javascript
// Получить права пользователя в конкретной организации
const org = userInfo.organizations?.find(org => org.id === organizationId);
const orgPermissions = org?.role.permissions || []; // Все права в этой организации

// Проверить право в организации
const canCreateUsers = orgPermissions.some(
  perm => perm.name === 'users.create'
);

// Получить глобальные права
const globalPermissions = userInfo.globalRoles?.flatMap(role => role.permissions) || [];
```

### Документация:

Полная документация по интеграции доступна в файлах:
- `LOGINUS_OAUTH_QUICK_START.md` - быстрый старт
- `LOGINUS_OAUTH_INTEGRATION_GUIDE.md` - полное руководство

---

**Важно:** 
- `LOGINUS_CLIENT_SECRET` храните только на бэкенде, никогда не передавайте на фронт!
- Redirect URI должен точно совпадать с зарегистрированным (включая протокол, порт и путь)

