# Исправление проблемы с отображением модулей авторизации

## Проблема
На главной странице входа (index.html) показывалось, что вход через GitHub и Telegram отключен, хотя в системе все микромодули были включены.

## Причина
Таблица `micro_module_settings` в базе данных была пустой. Метод `getModuleStatus` в `MicroModuleSettingsService` возвращал:
- `true` для `email-auth` (по умолчанию)
- `false` для всех остальных модулей, если записи нет в базе

## Решение
Добавлены записи в таблицу `micro_module_settings` для всех модулей со значением `isEnabled: true`:

```sql
INSERT INTO micro_module_settings ("moduleName", "isEnabled") 
VALUES 
  ('email-auth', true),
  ('github-auth', true),
  ('telegram-auth', true),
  ('referral-system', true)
ON CONFLICT ("moduleName") DO UPDATE SET "isEnabled" = EXCLUDED."isEnabled";
```

## Результат

### До исправления:
```json
{
  "email": {"enabled": true},
  "github": {"enabled": false},  // ❌
  "telegram": {"enabled": false}  // ❌
}
```

### После исправления:
```json
{
  "email": {"enabled": true},    // ✅
  "github": {"enabled": true},    // ✅
  "telegram": {"enabled": true}   // ✅
}
```

## Проверка

**API endpoint:**
```bash
curl https://loginus.startapus.com/api/micro-modules/auth/status
```

**База данных:**
```sql
SELECT "moduleName", "isEnabled" FROM micro_module_settings;
```

Результат:
- `email-auth`: `true`
- `github-auth`: `true`
- `telegram-auth`: `true`
- `referral-system`: `true`

## Статус
✅ Все модули авторизации теперь правильно отображаются как включенные на главной странице входа.

