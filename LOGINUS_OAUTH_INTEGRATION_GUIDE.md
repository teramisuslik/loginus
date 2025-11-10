# Loginus OAuth 2.0 - Руководство по интеграции

Полное руководство по интеграции вашего сервиса с Loginus через OAuth 2.0.

**Base URL:** `https://vselena.ldmco.ru/api`

---

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Регистрация OAuth клиента](#регистрация-oauth-клиента)
3. [OAuth Flow](#oauth-flow)
4. [API Endpoints](#api-endpoints)
5. [Данные о пользователе](#данные-о-пользователе)
6. [Примеры интеграции](#примеры-интеграции)
7. [Безопасность](#безопасность)
8. [Обработка ошибок](#обработка-ошибок)

---

## 🚀 Быстрый старт

### Шаг 1: Получите OAuth credentials

Обратитесь к администратору Loginus для регистрации вашего сервиса как OAuth клиента. Вы получите:
- `client_id` - публичный идентификатор вашего клиента
- `client_secret` - секретный ключ (храните в безопасности!)
- Список разрешенных `redirect_uri`

### Шаг 2: Настройте redirect URI

Укажите URL, на который Loginus будет перенаправлять пользователей после авторизации:
- Для разработки: `http://localhost:3000/auth/callback`
- Для production: `https://yourdomain.com/auth/callback`

**Важно:** URL должен точно совпадать с зарегистрированным в Loginus.

### Шаг 3: Инициируйте OAuth flow

Перенаправьте пользователя на:
```
GET https://vselena.ldmco.ru/api/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=openid%20email%20profile&state=RANDOM_STATE
```

### Шаг 4: Обработайте callback

После авторизации пользователь будет перенаправлен на ваш `redirect_uri` с параметрами:
- `code` - authorization code (действителен 10 минут)
- `state` - тот же state, что вы отправили

### Шаг 5: Обменяйте code на токен

Отправьте POST запрос на `/oauth/token` для получения access token.

### Шаг 6: Получите информацию о пользователе

Используйте access token для запроса `/oauth/userinfo` и получения полной информации о пользователе.

---

## 🔐 Регистрация OAuth клиента

### Через API (требуются права администратора)

```http
POST /oauth/clients/register
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "name": "Your Service Name",
  "redirect_uris": [
    "http://localhost:3000/auth/callback",
    "https://yourdomain.com/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

**Ответ:**
```json
{
  "client_id": "your-client-id-here",
  "client_secret": "your-client-secret-here",
  "name": "Your Service Name",
  "redirect_uris": [
    "http://localhost:3000/auth/callback",
    "https://yourdomain.com/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

**⚠️ ВАЖНО:** Сохраните `client_secret` сразу после получения! Он показывается только один раз.

### Через администратора

Если у вас нет доступа к API, обратитесь к администратору Loginus с запросом на регистрацию клиента.

---

## 🔄 OAuth Flow

### Authorization Code Flow (поддерживается)

```
┌─────────────┐                                    ┌──────────────┐
│   Ваш       │                                    │   Loginus    │
│   Сервис    │                                    │              │
└──────┬──────┘                                    └──────┬───────┘
       │                                                   │
       │  1. GET /oauth/authorize                         │
       │     ?client_id=...&redirect_uri=...&state=...    │
       ├──────────────────────────────────────────────────>│
       │                                                   │
       │              ┌──────────────────┐                │
       │              │ Пользователь     │                │
       │              │ авторизуется     │                │
       │              │ (Email/GitHub/   │                │
       │              │  Telegram)        │                │
       │              └──────────────────┘                │
       │                                                   │
       │  2. Redirect с code                              │
       │     redirect_uri?code=...&state=...              │
       │<──────────────────────────────────────────────────┤
       │                                                   │
       │  3. POST /oauth/token                            │
       │     grant_type=authorization_code&code=...        │
       ├──────────────────────────────────────────────────>│
       │                                                   │
       │  4. Access Token                                 │
       │     {access_token, expires_in, ...}              │
       │<──────────────────────────────────────────────────┤
       │                                                   │
       │  5. GET /oauth/userinfo                          │
       │     Authorization: Bearer {access_token}         │
       ├──────────────────────────────────────────────────>│
       │                                                   │
       │  6. User Info                                    │
       │     {id, email, organizations, teams, ...}       │
       │<──────────────────────────────────────────────────┤
       │                                                   │
```

### Сценарии авторизации

#### Сценарий 1: Пользователь уже авторизован в Loginus

1. Пользователь переходит на ваш сервис
2. Ваш сервис перенаправляет на `/oauth/authorize`
3. Loginus проверяет авторизацию → пользователь авторизован
4. Loginus создает authorization code и редиректит на ваш `redirect_uri`
5. Ваш сервис обменивает code на access token
6. Ваш сервис получает информацию о пользователе

#### Сценарий 2: Пользователь не авторизован

1. Пользователь переходит на ваш сервис
2. Ваш сервис перенаправляет на `/oauth/authorize`
3. Loginus проверяет авторизацию → пользователь НЕ авторизован
4. Loginus сохраняет OAuth параметры в cookies и редиректит на страницу авторизации
5. Пользователь выбирает способ входа:
   - Email + пароль
   - GitHub OAuth
   - Telegram Login Widget
6. После успешной авторизации Loginus автоматически продолжает OAuth flow
7. Loginus создает authorization code и редиректит на ваш `redirect_uri`
8. Дальше как в сценарии 1 (шаги 5-6)

---

## 📡 API Endpoints

### 1. GET /oauth/authorize

Инициация OAuth flow. Перенаправляет пользователя на страницу авторизации или возвращает authorization code.

#### Параметры запроса (Query Parameters)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `client_id` | string | ✅ Да | ID вашего OAuth клиента |
| `redirect_uri` | string | ✅ Да | URL для редиректа после авторизации (должен быть зарегистрирован) |
| `response_type` | string | ✅ Да | Должно быть `code` |
| `scope` | string | ❌ Нет | Запрашиваемые разрешения через пробел (по умолчанию: `openid email profile`) |
| `state` | string | ❌ Нет | Случайная строка для защиты от CSRF (рекомендуется) |

#### Пример запроса

```http
GET https://vselena.ldmco.ru/api/oauth/authorize?client_id=your-client-id&redirect_uri=https://yourdomain.com/auth/callback&response_type=code&scope=openid%20email%20profile&state=abc123xyz789
```

#### Поведение

**Если пользователь авторизован:**
- HTTP 302 Found
- Location: `redirect_uri?code=AUTHORIZATION_CODE&state=abc123xyz789`

**Если пользователь НЕ авторизован:**
- HTTP 302 Found
- Location: `https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/api/oauth/authorize&client_id=your-client-id`
- OAuth параметры сохраняются в cookies (httpOnly, secure)

#### Пример ответа (успех)

```
HTTP/1.1 302 Found
Location: https://yourdomain.com/auth/callback?code=abc123def456&state=abc123xyz789
```

#### Пример ответа (неавторизован)

```
HTTP/1.1 302 Found
Location: https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/api/oauth/authorize&client_id=your-client-id
Set-Cookie: oauth_client_id=your-client-id; HttpOnly; SameSite=Lax; Max-Age=600
Set-Cookie: oauth_redirect_uri=https://yourdomain.com/auth/callback; HttpOnly; SameSite=Lax; Max-Age=600
Set-Cookie: oauth_scope=openid email profile; HttpOnly; SameSite=Lax; Max-Age=600
Set-Cookie: oauth_state_param=abc123xyz789; HttpOnly; SameSite=Lax; Max-Age=600
```

---

### 2. POST /oauth/token

Обмен authorization code на access token.

#### Параметры запроса

**Content-Type:** `application/x-www-form-urlencoded`

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `grant_type` | string | ✅ Да | Должно быть `authorization_code` |
| `code` | string | ✅ Да | Authorization code из `/oauth/authorize` |
| `redirect_uri` | string | ✅ Да | Тот же redirect_uri, что использовался в `/oauth/authorize` |
| `client_id` | string | ✅ Да | ID вашего OAuth клиента |
| `client_secret` | string | ✅ Да | Секретный ключ вашего клиента |

#### Пример запроса

```http
POST https://vselena.ldmco.ru/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=abc123def456&redirect_uri=https://yourdomain.com/auth/callback&client_id=your-client-id&client_secret=your-client-secret
```

#### Пример ответа (успех)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzY29wZXMiOlsib3BlbmlkIiwiZW1haWwiLCJwcm9maWxlIl0sImNsaWVudElkIjoieW91ci1jbGllbnQtaWQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.xxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmaXJzdE5hbWUiOiJJdmFuIiwibGFzdE5hbWUiOiJJdmFub3YiLCJwaG9uZSI6Iis3OTk5MTIzNDU2NyIsImVtYWlsVmVyaWZpZWQiOnRydWUsInBob25lVmVyaWZpZWQiOnRydWUsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAzNjAwfQ.yyy"
}
```

#### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `access_token` | string | JWT токен для доступа к API (действителен 1 час) |
| `token_type` | string | Тип токена (всегда `Bearer`) |
| `expires_in` | number | Время жизни токена в секундах (3600 = 1 час) |
| `refresh_token` | string | Токен для обновления access_token (опционально) |
| `id_token` | string | JWT токен с базовой информацией о пользователе |

#### Пример ошибки

```json
{
  "statusCode": 400,
  "message": "Invalid or expired authorization code",
  "error": "Bad Request"
}
```

**Важно:**
- Authorization code действителен только **10 минут**
- Authorization code может быть использован только **один раз**
- После использования код помечается как `isUsed = true`

---

### 3. GET /oauth/userinfo

Получение полной информации о пользователе, включая организации, команды, роли и права.

#### Headers

| Header | Значение | Обязательный |
|--------|----------|--------------|
| `Authorization` | `Bearer {access_token}` | ✅ Да |

#### Пример запроса

```http
GET https://vselena.ldmco.ru/api/oauth/userinfo
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Пример ответа (успех)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+79991234567",
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "oauthMetadata": {
    "github": {
      "provider": "github",
      "providerId": "12345678",
      "username": "octocat",
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345678?v=4",
      "profileUrl": "https://github.com/octocat"
    }
  },
  "messengerMetadata": {
    "telegram": {
      "userId": "123456789",
      "username": "johndoe"
    }
  },
  "organizations": [
    {
      "id": "org-001",
      "name": "Acme Corporation",
      "role": {
        "id": "role-001",
        "name": "Admin",
        "permissions": [
          {
            "id": "perm-001",
            "name": "users.create",
            "resource": "users",
            "action": "create"
          },
          {
            "id": "perm-002",
            "name": "users.read",
            "resource": "users",
            "action": "read"
          },
          {
            "id": "perm-003",
            "name": "knowledge.categories.read",
            "resource": "knowledge.categories",
            "action": "read"
          }
        ]
      },
      "joinedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "teams": [
    {
      "id": "team-001",
      "name": "Development Team",
      "organizationId": "org-001",
      "role": {
        "id": "role-002",
        "name": "Developer",
        "permissions": [
          {
            "id": "perm-004",
            "name": "teams.read",
            "resource": "teams",
            "action": "read"
          }
        ]
      },
      "joinedAt": "2024-02-01T09:00:00.000Z"
    }
  ],
  "globalRoles": [
    {
      "id": "role-003",
      "name": "super_admin",
      "description": "Супер администратор системы",
      "permissions": [
        {
          "id": "perm-005",
          "name": "system.settings",
          "resource": "system",
          "action": "settings"
        },
        {
          "id": "perm-006",
          "name": "system.logs",
          "resource": "system",
          "action": "logs"
        }
      ]
    }
  ]
}
```

#### Поля ответа

##### Базовые поля

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string (UUID) | Уникальный идентификатор пользователя |
| `email` | string \| null | Email пользователя (может быть null для OAuth пользователей) |
| `firstName` | string | Имя пользователя |
| `lastName` | string | Фамилия пользователя |
| `phone` | string \| null | Телефон пользователя (опционально) |
| `isVerified` | boolean | Статус верификации (`emailVerified && phoneVerified`) |
| `createdAt` | string (ISO 8601) | Дата создания аккаунта |

##### Метаданные OAuth

| Поле | Тип | Описание |
|------|-----|----------|
| `oauthMetadata` | object \| null | Метаданные от OAuth провайдеров (GitHub, Госуслуги, VKontakte) |
| `oauthMetadata.github` | object \| null | Метаданные GitHub (если пользователь авторизован через GitHub) |
| `oauthMetadata.github.providerId` | string | GitHub ID пользователя |
| `oauthMetadata.github.username` | string | GitHub username |
| `oauthMetadata.github.avatarUrl` | string | URL аватара GitHub |
| `oauthMetadata.github.profileUrl` | string | URL профиля GitHub |

##### Метаданные мессенджеров

| Поле | Тип | Описание |
|------|-----|----------|
| `messengerMetadata` | object \| null | Метаданные мессенджеров (Telegram, WhatsApp) |
| `messengerMetadata.telegram` | object \| null | Метаданные Telegram (если пользователь авторизован через Telegram) |
| `messengerMetadata.telegram.userId` | string | Telegram User ID |
| `messengerMetadata.telegram.username` | string | Telegram username (без @) |

##### Организации

| Поле | Тип | Описание |
|------|-----|----------|
| `organizations` | array \| undefined | Массив организаций, к которым принадлежит пользователь |
| `organizations[].id` | string (UUID) | ID организации |
| `organizations[].name` | string | Название организации |
| `organizations[].role` | object | Роль пользователя в организации |
| `organizations[].role.id` | string (UUID) | ID роли |
| `organizations[].role.name` | string | Название роли |
| `organizations[].role.permissions` | array | Массив прав роли |
| `organizations[].role.permissions[].id` | string (UUID) | ID права |
| `organizations[].role.permissions[].name` | string | Полное имя права (например, `users.create`) |
| `organizations[].role.permissions[].resource` | string | Ресурс (например, `users`) |
| `organizations[].role.permissions[].action` | string | Действие (например, `create`) |
| `organizations[].joinedAt` | string (ISO 8601) | Дата присоединения к организации |

##### Команды

| Поле | Тип | Описание |
|------|-----|----------|
| `teams` | array \| undefined | Массив команд, к которым принадлежит пользователь |
| `teams[].id` | string (UUID) | ID команды |
| `teams[].name` | string | Название команды |
| `teams[].organizationId` | string (UUID) \| undefined | ID организации, к которой принадлежит команда (если есть) |
| `teams[].role` | object | Роль пользователя в команде |
| `teams[].role.id` | string (UUID) | ID роли |
| `teams[].role.name` | string | Название роли |
| `teams[].role.permissions` | array | Массив прав роли (структура как в organizations) |
| `teams[].joinedAt` | string (ISO 8601) | Дата присоединения к команде |

##### Глобальные роли

| Поле | Тип | Описание |
|------|-----|----------|
| `globalRoles` | array \| undefined | Массив глобальных ролей пользователя (не привязанных к организации/команде) |
| `globalRoles[].id` | string (UUID) | ID роли |
| `globalRoles[].name` | string | Название роли (например, `super_admin`, `admin`, `user`) |
| `globalRoles[].description` | string \| undefined | Описание роли |
| `globalRoles[].permissions` | array | Массив прав роли (структура как в organizations) |

##### Все права пользователя

| Поле | Тип | Описание |
|------|-----|----------|
**Примечание:** Права разделены по источникам:
- **Права организаций** - в `organizations[].role.permissions` (права конкретной организации)
- **Права команд** - в `teams[].role.permissions` (права конкретной команды)
- **Глобальные права** - в `globalRoles[].permissions` (права глобальных ролей)

Для проверки прав используйте соответствующий источник в зависимости от контекста.

#### Пример ошибки

```json
{
  "statusCode": 401,
  "message": "Invalid access token",
  "error": "Unauthorized"
}
```

---

### 4. POST /oauth/logout

Выход из системы OAuth (опциональный endpoint).

#### Параметры запроса (JSON)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `token` | string | ❌ Нет | Access token или refresh token для инвалидации |
| `redirect_uri` | string | ❌ Нет | URL для редиректа после выхода |

#### Пример запроса

```http
POST https://vselena.ldmco.ru/api/oauth/logout
Content-Type: application/json

{
  "token": "access_token_here",
  "redirect_uri": "https://yourdomain.com"
}
```

#### Пример ответа

Если указан `redirect_uri`:
```
HTTP/1.1 302 Found
Location: https://yourdomain.com
```

Если `redirect_uri` не указан:
```json
{
  "message": "Logged out successfully"
}
```

---

## 👤 Данные о пользователе

### Структура данных

API `/oauth/userinfo` возвращает полную информацию о пользователе, включая:

1. **Базовую информацию** - id, email, имя, телефон, статус верификации
2. **Метаданные OAuth** - информация от провайдеров (GitHub, Госуслуги, VKontakte)
3. **Метаданные мессенджеров** - информация от Telegram, WhatsApp
4. **Организации** - список организаций с ролями и правами
5. **Команды** - список команд с ролями и правами
6. **Глобальные роли** - роли, не привязанные к организации/команде
7. **Все права** - объединенный список всех уникальных прав пользователя

### Примеры использования данных

#### Проверка прав пользователя

```javascript
// Проверить право в конкретной организации
const org = userInfo.organizations?.find(org => org.id === 'org-001');
const hasCreateUserPermission = org?.role.permissions?.some(
  perm => perm.name === 'users.create'
);

// Проверить право на работу с категориями знаний в организации
const hasKnowledgeCategoriesRead = org?.role.permissions?.some(
  perm => perm.name === 'knowledge.categories.read'
);

// Проверить глобальное право (из глобальных ролей)
const globalPermissions = userInfo.globalRoles?.flatMap(role => role.permissions) || [];
const hasGlobalPermission = globalPermissions.some(
  perm => perm.name === 'users.create'
);

// Проверить, является ли пользователь администратором организации
const isOrgAdmin = userInfo.organizations?.some(
  org => org.role.name === 'Admin' || org.role.name === 'admin'
);
```

#### Получение прав в конкретной организации

```javascript
// Получить права пользователя в конкретной организации
const org = userInfo.organizations?.find(org => org.id === 'org-001');
const orgPermissions = org?.role.permissions || [];

// Проверить право в организации
const canCreateUsersInOrg = orgPermissions.some(
  perm => perm.name === 'users.create'
);
```

#### Получение прав в команде

```javascript
// Получить права пользователя в конкретной команде
const team = userInfo.teams?.find(team => team.id === 'team-001');
const teamPermissions = team?.role.permissions || [];
```

#### Проверка глобальных прав

```javascript
// Проверить, является ли пользователь суперадмином
const isSuperAdmin = userInfo.globalRoles?.some(
  role => role.name === 'super_admin'
);

// Получить все права из глобальных ролей
const globalPermissions = userInfo.globalRoles?.flatMap(
  role => role.permissions
) || [];
```

### Доступные права

#### Права для пользователей
- `users.create` - Создание пользователей
- `users.read` - Просмотр пользователей
- `users.update` - Редактирование пользователей
- `users.delete` - Удаление пользователей

#### Права для ролей
- `roles.create` - Создание ролей
- `roles.read` - Просмотр ролей
- `roles.update` - Редактирование ролей
- `roles.delete` - Удаление ролей
- `roles.assign` - Назначение ролей

#### Права для организаций
- `organizations.create` - Создание организаций
- `organizations.read` - Просмотр организаций
- `organizations.update` - Редактирование организаций
- `organizations.delete` - Удаление организаций

#### Права для команд
- `teams.create` - Создание команд
- `teams.read` - Просмотр команд
- `teams.update` - Редактирование команд
- `teams.delete` - Удаление команд

#### Права для категорий знаний
- `knowledge.categories.read` - Просмотр категорий
- `knowledge.categories.create` - Создание категорий
- `knowledge.categories.update` - Редактирование категорий
- `knowledge.categories.delete` - Удаление категорий

#### Системные права
- `system.settings` - Настройки системы
- `system.logs` - Просмотр логов
- `system.backup` - Резервное копирование

**Примечание:** Список прав может расширяться. Права разделены по источникам:
- Для проверки прав в организации используйте `organizations[].role.permissions`
- Для проверки прав в команде используйте `teams[].role.permissions`
- Для проверки глобальных прав используйте `globalRoles[].permissions`

---

## 💻 Примеры интеграции

### JavaScript/TypeScript (Frontend + Backend)

#### Frontend: Инициация OAuth flow

```javascript
// Генерируем state для CSRF защиты
const state = generateRandomString(32);
localStorage.setItem('oauth_state', state);

// Формируем URL для авторизации
const clientId = 'your-client-id';
const redirectUri = encodeURIComponent('https://yourdomain.com/auth/callback');
const scope = 'openid email profile';
const authUrl = `https://vselena.ldmco.ru/api/oauth/authorize?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `scope=${scope}&` +
  `state=${state}`;

// Перенаправляем пользователя
window.location.href = authUrl;
```

#### Backend: Обработка callback и обмен code на токен

```javascript
// Express.js пример
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Проверяем state (защита от CSRF)
  const savedState = req.session.oauth_state;
  if (state !== savedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  // Обмениваем code на токен
  try {
    const tokenResponse = await fetch('https://vselena.ldmco.ru/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://yourdomain.com/auth/callback',
        client_id: process.env.LOGINUS_CLIENT_ID,
        client_secret: process.env.LOGINUS_CLIENT_SECRET, // Только на сервере!
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(error.message);
    }
    
    const tokens = await tokenResponse.json();
    
    // Получаем информацию о пользователе
    const userInfoResponse = await fetch('https://vselena.ldmco.ru/api/oauth/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });
    
    const userInfo = await userInfoResponse.json();
    
    // Синхронизируем пользователя в вашей БД
    await syncUserToDatabase(userInfo);
    
    // Создаем сессию для пользователя
    req.session.userId = userInfo.id;
    req.session.accessToken = tokens.access_token;
    
    // Перенаправляем на главную страницу
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});
```

#### Backend: Использование access token для проверки прав

```javascript
// Middleware для проверки прав
async function checkPermission(req, res, next) {
  const accessToken = req.session.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Получаем актуальную информацию о пользователе
    const userInfoResponse = await fetch('https://vselena.ldmco.ru/api/oauth/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      // Токен истек или невалиден
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const userInfo = await userInfoResponse.json();
    
    // Проверяем права в организации
    const org = userInfo.organizations?.find(org => org.id === organizationId);
    const requiredPermission = 'knowledge.categories.create';
    const hasPermission = org?.role.permissions?.some(
      perm => perm.name === requiredPermission
    ) || false;
    
    // Или проверяем глобальные права
    const globalPermissions = userInfo.globalRoles?.flatMap(role => role.permissions) || [];
    const hasGlobalPermission = globalPermissions.some(
      perm => perm.name === requiredPermission
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Добавляем информацию о пользователе в request
    req.user = userInfo;
    next();
    
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
}

// Использование middleware
app.post('/api/categories', checkPermission, async (req, res) => {
  // Пользователь имеет право на создание категорий
  // Создаем категорию...
});
```

### Python (Flask)

```python
from flask import Flask, redirect, request, session, jsonify
import requests
import secrets

app = Flask(__name__)
app.secret_key = 'your-secret-key'

LOGINUS_BASE_URL = 'https://vselena.ldmco.ru/api'
CLIENT_ID = 'your-client-id'
CLIENT_SECRET = 'your-client-secret'
REDIRECT_URI = 'https://yourdomain.com/auth/callback'

@app.route('/auth/login')
def login():
    # Генерируем state
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    
    # Формируем URL для авторизации
    auth_url = f"{LOGINUS_BASE_URL}/oauth/authorize?" + \
        f"client_id={CLIENT_ID}&" + \
        f"redirect_uri={REDIRECT_URI}&" + \
        f"response_type=code&" + \
        f"scope=openid email profile&" + \
        f"state={state}"
    
    return redirect(auth_url)

@app.route('/auth/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Проверяем state
    if state != session.get('oauth_state'):
        return jsonify({'error': 'Invalid state parameter'}), 400
    
    # Обмениваем code на токен
    token_response = requests.post(
        f"{LOGINUS_BASE_URL}/oauth/token",
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
        }
    )
    
    if token_response.status_code != 200:
        return jsonify({'error': 'Token exchange failed'}), 400
    
    tokens = token_response.json()
    
    # Получаем информацию о пользователе
    user_info_response = requests.get(
        f"{LOGINUS_BASE_URL}/oauth/userinfo",
        headers={'Authorization': f"Bearer {tokens['access_token']}"}
    )
    
    if user_info_response.status_code != 200:
        return jsonify({'error': 'Failed to get user info'}), 400
    
    user_info = user_info_response.json()
    
    # Сохраняем в сессию
    session['user_id'] = user_info['id']
    session['access_token'] = tokens['access_token']
    session['user_info'] = user_info
    
    return redirect('/dashboard')

@app.route('/api/user/permissions')
def get_permissions():
    access_token = session.get('access_token')
    
    if not access_token:
        return jsonify({'error': 'Not authenticated'}), 401
    
    # Получаем актуальную информацию о пользователе
    user_info_response = requests.get(
        f"{LOGINUS_BASE_URL}/oauth/userinfo",
        headers={'Authorization': f"Bearer {access_token}"}
    )
    
    if user_info_response.status_code != 200:
        return jsonify({'error': 'Invalid token'}), 401
    
    user_info = user_info_response.json()
    
    # Права разделены по источникам
    org_permissions = []
    for org in user_info.get('organizations', []):
        org_permissions.extend(org.get('role', {}).get('permissions', []))
    
    team_permissions = []
    for team in user_info.get('teams', []):
        team_permissions.extend(team.get('role', {}).get('permissions', []))
    
    global_permissions = []
    for role in user_info.get('globalRoles', []):
        global_permissions.extend(role.get('permissions', []))
    
    return jsonify({
        'organizations': user_info.get('organizations', []),
        'teams': user_info.get('teams', []),
        'globalRoles': user_info.get('globalRoles', []),
        # Для обратной совместимости можно объединить все права
        'allPermissions': org_permissions + team_permissions + global_permissions,
    })
```

---

## 🔒 Безопасность

### Рекомендации

1. **HTTPS обязателен** для production окружения
   - Все запросы должны идти через HTTPS
   - `redirect_uri` должен использовать HTTPS в production

2. **Хранение client_secret**
   - Никогда не храните `client_secret` в клиентском коде
   - Храните `client_secret` только на сервере в переменных окружения
   - Не коммитьте `client_secret` в Git

3. **Использование state параметра**
   - Всегда используйте `state` параметр для защиты от CSRF
   - Генерируйте случайную строку для каждого запроса
   - Проверяйте `state` при получении callback

4. **Валидация redirect_uri**
   - `redirect_uri` должен точно совпадать с зарегистрированным
   - Не используйте wildcard в `redirect_uri`
   - Регистрируйте отдельные URI для dev и production

5. **Сроки действия токенов**
   - Authorization code: **10 минут**
   - Access token: **1 час (3600 секунд)**
   - Реализуйте обновление токенов через refresh_token (если доступен)

6. **Хранение access token**
   - Храните access token в безопасном месте (httpOnly cookies, secure storage)
   - Не передавайте access token в URL
   - Используйте HTTPS для передачи токенов

7. **Проверка прав**
   - Всегда проверяйте права пользователя на сервере
   - Не полагайтесь только на клиентскую проверку
   - Кэшируйте информацию о пользователе, но периодически обновляйте

---

## ⚠️ Обработка ошибок

### Коды ошибок

| Код | Описание | Действие |
|-----|----------|----------|
| 400 | Bad Request - неверные параметры запроса | Проверьте параметры запроса |
| 401 | Unauthorized - пользователь не авторизован или токен невалиден | Перенаправьте на авторизацию или обновите токен |
| 403 | Forbidden - недостаточно прав | Покажите сообщение об отсутствии прав |
| 404 | Not Found - OAuth клиент не найден | Проверьте client_id |
| 500 | Internal Server Error - ошибка на стороне сервера | Повторите запрос позже |

### Примеры обработки ошибок

#### JavaScript

```javascript
async function getUserInfo(accessToken) {
  try {
    const response = await fetch('https://vselena.ldmco.ru/api/oauth/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (response.status === 401) {
      // Токен истек или невалиден
      // Перенаправляем на авторизацию
      window.location.href = '/auth/login';
      return null;
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get user info');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error getting user info:', error);
    // Обработка ошибки
    return null;
  }
}
```

#### Python

```python
def get_user_info(access_token):
    try:
        response = requests.get(
            f"{LOGINUS_BASE_URL}/oauth/userinfo",
            headers={'Authorization': f"Bearer {access_token}"}
        )
        
        if response.status_code == 401:
            # Токен истек
            return None, 'Token expired'
        
        if response.status_code != 200:
            error = response.json()
            return None, error.get('message', 'Failed to get user info')
        
        return response.json(), None
        
    except requests.RequestException as e:
        return None, str(e)
```

---

## 📞 Контакты и поддержка

Для регистрации OAuth клиента, получения дополнительной информации или сообщения об ошибках обращайтесь к администратору Loginus.

**Email:** [указать email администратора]  
**Документация:** [ссылка на документацию]  
**Base URL:** `https://vselena.ldmco.ru/api`

---

## 📝 Changelog

### Версия 2.0 (Текущая)

- ✅ Добавлена полная информация о пользователе (организации, команды, роли, права)
- ✅ Расширен endpoint `/oauth/userinfo` с детальной информацией о правах
- ✅ Добавлена поддержка метаданных OAuth провайдеров и мессенджеров
- ✅ Улучшена обработка неавторизованных пользователей (автоматический редирект)

### Версия 1.0

- ✅ Базовая OAuth 2.0 интеграция
- ✅ Authorization Code Flow
- ✅ Базовая информация о пользователе

---

**Последнее обновление:** 6 ноября 2025

