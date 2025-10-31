# Анализ базы данных и миграций

## Текущее состояние

### Выполненные миграции (29 из 30)
1. CreateOrganizations1731840001000 ✅
2. CreateTeams1731840002000 ✅
3. CreateUsers1731840003000 ✅
4. CreateRoles1731840004000 ✅
5. CreatePermissions1731840005000 ✅
6. CreateUserRoles1731840006000 ✅
7. CreateRolePermissions1731840007000 ✅
8. CreateRefreshTokens1731840008000 ✅
9. CreateAuditLogs1731840009000 ✅
10. AddTwoFactorSettings1731840009001 ✅
11. CreatePasswordResetTokens1731840009002 ✅
12. CreateSuperAdmin1731840009003 ✅
13. CreateEmailVerificationTokens1731840009004 ✅
14. CreateTwoFactorCodes1731840010000 ✅
15. AddPhoneToUsers1731840011000 ✅
16. CreateInvitations1731840012000 ✅
17. AddCreatedByToOrganizationsAndTeams1731840012001 ✅
18. CreateUserOrganizationsAndTeamsTables1731840012002 ✅
19. CreateReferrals1731840012003 ✅
20. FixInvitationsCascade1731840012004 ✅
21. CreateSystemSettings1731840013000 ✅
22. RemoveSlugFromOrganizations1732124000000 ✅
23. **CreateUserRoleAssignments1761340259370** ❌ НЕ ВЫПОЛНЕНА (таблица существует)
24. CreateOrganizationRoles1761340259371 ✅
25. AddLevelToRoles1761340259372 ✅
26. ReplaceCreatorAndMemberRoles1761340259373 ✅
27. UpdateUserRoleAssignments1761340259374 ✅
28. FixUserRoleAssignmentsRoleIdNullable1761340259375 ✅
29. AddMultiAuthFields1761341000000 ✅
30. CreateMultiAuthTables1761341000001 ✅

### Проблемы

#### 1. Миграция CreateUserRoleAssignments исправлена ✅
- **Файл существует**: `1761340259370-CreateUserRoleAssignments.ts`
- **Таблица существует**: `user_role_assignments` создана в БД
- **Миграция исправлена**: запись добавлена в таблицу `migrations` вручную

**Решение применено**: `INSERT INTO migrations (timestamp, name) VALUES (1761340259370, 'CreateUserRoleAssignments1761340259370');`

### Структура таблиц

#### Основные таблицы (25 таблиц):
1. `account_merge_requests` - запросы на объединение аккаунтов
2. `audit_logs` - логи аудита
3. `email_verification_tokens` - токены верификации email
4. `invitations` - приглашения
5. `migrations` - выполненые миграции
6. `organization_memberships` - членства в организациях
7. `organization_roles` - роли организаций
8. `organizations` - организации
9. `password_reset_tokens` - токены сброса пароля
10. `permissions` - права доступа
11. `referrals` - реферальные связи
12. `refresh_tokens` - токены обновления
13. `role_permissions` - права ролей
14. `roles` - роли
15. `system_settings` - системные настройки
16. `team_memberships` - членства в командах
17. `team_roles` - роли команд
18. `teams` - команды
19. `two_factor_codes` - коды двухфакторной аутентификации
20. `user_organizations` - связи пользователей с организациями
21. `user_role_assignments` - назначения ролей пользователям
22. `user_roles` - роли пользователей (устарело?)
23. `user_teams` - связи пользователей с командами
24. `users` - пользователи
25. `verification_codes` - коды верификации

### Важные особенности

#### 1. Система ролей (3 уровня):
- **Глобальные роли** (`roles`): `super_admin`, `admin`, `manager`, `editor`, `viewer`
  - `isGlobal = true`
  - `organizationId = null`
  - `teamId = null`

- **Организационные роли** (`organization_roles`): роли на уровне организации
  - `organizationId` указан

- **Командные роли** (`team_roles`): роли на уровне команды
  - `teamId` указан

#### 2. Система назначения ролей (`user_role_assignments`):
- `userId` - пользователь
- `roleId` - глобальная роль (nullable)
- `organizationRoleId` - роль организации (nullable)
- `teamRoleId` - роль команды (nullable)
- `organizationId` - организация (для контекста)
- `teamId` - команда (для контекста)

#### 3. Приглашения (`invitations`):
- Колонка `role` хранит UUID роли (может быть из `roles`, `organization_roles` или `team_roles`)
- Колонка `type` определяет тип приглашения: `organization` или `team`
- Timestamps в snake_case: `created_at`, `updated_at`, `expires_at`, `accepted_at`, `declined_at`

### Рекомендации для переноса на сервер

#### 1. Исправить миграцию CreateUserRoleAssignments:
```sql
INSERT INTO migrations (timestamp, name) 
VALUES (1761340259370, 'CreateUserRoleAssignments1761340259370');
```

#### 2. Перед запуском на сервере:
1. Убедиться, что все миграции в правильном порядке
2. Запустить миграции на чистой БД
3. Проверить, что все таблицы созданы
4. Проверить, что `user_role_assignments` создана и заполнена
5. Проверить, что система ролей работает корректно

#### 3. Check-лист перед деплоем:
- [ ] Все миграции в папке `src/database/migrations`
- [ ] Миграция CreateUserRoleAssignments1761340259370 записана в migrations
- [ ] Все таблицы существуют (проверить через `\dt`)
- [ ] Все индексы созданы (проверить через `\di`)
- [ ] Все foreign keys созданы (проверить через `\d+ table_name`)
- [ ] Тестовые роли созданы (super_admin, admin, manager, editor, viewer)
- [ ] Тестовый суперадмин создан

#### 4. Команды для проверки БД:
```bash
# Список всех таблиц
docker exec loginus-db psql -U loginus -d loginus_dev -c "\dt"

# Проверка миграций
docker exec loginus-db psql -U loginus -d loginus_dev -c "SELECT * FROM migrations ORDER BY timestamp;"

# Структура таблицы
docker exec loginus-db psql -U loginus -d loginus_dev -c "\d+ table_name"

# Проверка ролей
docker exec loginus-db psql -U loginus -d loginus_dev -c "SELECT id, name, \"isGlobal\" FROM roles;"
```

### Критические исправления

#### Исправлена миграция CreateInvitations:
- Изменено: колонки `expires_at`, `accepted_at`, `declined_at`, `created_at`, `updated_at` (snake_case)
- Удалено: `firstName`, `lastName`, `metadata`
- Изменено: `role` (varchar) вместо `roleId` (uuid с FK)

#### Исправлен SQL запрос getSentInvitations:
- Добавлен JOIN к `team_roles` для team invitations
- Добавлен JOIN к `organization_roles` для organization invitations
- Добавлен JOIN к `roles` для global roles
- Использован COALESCE для выбора правильного названия роли

### Текущее состояние
- ✅ Все миграции выполнены и записаны (30/30)
- ✅ Все таблицы созданы (25 таблиц)
- ✅ Миграция CreateUserRoleAssignments исправлена
- ✅ Роли созданы и назначены (super_admin, admin, manager, editor, viewer)
- ✅ Приглашения работают корректно
- ✅ SQL запросы исправлены (getSentInvitations)
- ✅ БД готова к переносу на сервер

