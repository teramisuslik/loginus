# Loginus OAuth 2.0 - Быстрый старт

Краткое руководство по интеграции вашего сервиса с Loginus.

**Base URL:** `https://vselena.ldmco.ru/api`

---

## 🚀 5 шагов к интеграции

### 1. Получите OAuth credentials

Обратитесь к администратору Loginus для регистрации вашего сервиса. Вы получите:
- `client_id`
- `client_secret`
- Список разрешенных `redirect_uri`

### 2. Перенаправьте пользователя на авторизацию

```javascript
const authUrl = `https://vselena.ldmco.ru/api/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=openid email profile&` +
  `state=${generateRandomString()}`;

window.location.href = authUrl;
```

### 3. Обработайте callback

После авторизации пользователь вернется на ваш `redirect_uri` с параметрами:
- `code` - authorization code
- `state` - ваш state (проверьте его!)

### 4. Обменяйте code на токен (на сервере!)

```javascript
const response = await fetch('https://vselena.ldmco.ru/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET, // Только на сервере!
  }),
});

const tokens = await response.json();
// { access_token, token_type, expires_in, ... }
```

### 5. Получите информацию о пользователе

```javascript
const userInfo = await fetch('https://vselena.ldmco.ru/api/oauth/userinfo', {
  headers: { 'Authorization': `Bearer ${tokens.access_token}` },
});

const user = await userInfo.json();
// {
//   id, email, firstName, lastName,
//   organizations: [...], // Организации с ролями и правами (права в organizations[].role.permissions)
//   teams: [...],         // Команды с ролями и правами (права в teams[].role.permissions)
//   globalRoles: [...],  // Глобальные роли (права в globalRoles[].permissions)
// }
```

---

## 📋 Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/oauth/authorize` | GET | Инициация OAuth flow |
| `/oauth/token` | POST | Обмен code на access token |
| `/oauth/userinfo` | GET | Получение информации о пользователе |
| `/oauth/logout` | POST | Выход из системы |

---

## 👤 Данные о пользователе

API `/oauth/userinfo` возвращает:

### Базовая информация
- `id`, `email`, `firstName`, `lastName`, `phone`
- `isVerified`, `createdAt`

### Организации
- Список организаций, к которым принадлежит пользователь
- Роль в каждой организации
- Права роли в организации

### Команды
- Список команд, к которым принадлежит пользователь
- Роль в каждой команде
- Права роли в команде

### Глобальные роли
- Роли, не привязанные к организации/команде
- Права глобальных ролей

### Структура прав

**Права разделены по источникам:**
- **Права организаций** - в `organizations[].role.permissions` (права конкретной организации)
- **Права команд** - в `teams[].role.permissions` (права конкретной команды)
- **Глобальные права** - в `globalRoles[].permissions` (права глобальных ролей)

### Пример проверки прав

```javascript
// Проверить право в конкретной организации
const org = user.organizations?.find(org => org.id === 'org-001');
const canCreateUsers = org?.role.permissions?.some(
  perm => perm.name === 'users.create'
);

// Проверить право на работу с категориями знаний в организации
const canReadCategories = org?.role.permissions?.some(
  perm => perm.name === 'knowledge.categories.read'
);

// Проверить глобальное право
const globalPermissions = user.globalRoles?.flatMap(role => role.permissions) || [];
const hasGlobalPermission = globalPermissions.some(
  perm => perm.name === 'users.create'
);

// Проверить, является ли пользователь админом организации
const isOrgAdmin = user.organizations?.some(
  org => org.role.name === 'Admin'
);
```

---

## 🔒 Безопасность

1. ✅ **HTTPS обязателен** в production
2. ✅ **client_secret** только на сервере, никогда в клиенте
3. ✅ **Всегда используйте state** для защиты от CSRF
4. ✅ **Проверяйте redirect_uri** - должен точно совпадать
5. ✅ **Access token** действителен 1 час

---

## 📚 Полная документация

См. [LOGINUS_OAUTH_INTEGRATION_GUIDE.md](./LOGINUS_OAUTH_INTEGRATION_GUIDE.md) для:
- Детального описания всех endpoints
- Примеров интеграции на разных языках
- Обработки ошибок
- Расширенной информации о данных пользователя

---

## 📞 Поддержка

Для регистрации клиента или вопросов обращайтесь к администратору Loginus.

