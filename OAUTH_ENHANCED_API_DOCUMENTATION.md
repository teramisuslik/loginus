# Расширенная OAuth API документация для AI Aggregator

Документация по обновленным OAuth endpoints и структуре базы данных для интеграции с AI Aggregator, включая поддержку GitHub и Telegram OAuth.

**Base URL:** `https://vselena.ldmco.ru` (или `http://45.144.176.42:3001` для тестирования)

---

## Обновления в OAuth Flow

### Основное изменение

**GET /oauth/authorize** теперь автоматически перенаправляет неавторизованных пользователей на страницу авторизации Loginus вместо возврата ошибки 401.

---

## 1. GET /oauth/authorize (обновлено)

Инициация OAuth flow. Автоматически перенаправляет неавторизованных пользователей на страницу авторизации Loginus.

### Параметры запроса (Query Parameters)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `client_id` | string | Да | ID клиента (AI Aggregator) |
| `redirect_uri` | string | Да | URL для редиректа после авторизации (должен быть зарегистрирован для клиента) |
| `response_type` | string | Да | Тип ответа (должен быть `code` для Authorization Code flow) |
| `scope` | string | Нет | Запрашиваемые разрешения через пробел (по умолчанию: `openid email profile`) |
| `state` | string | Нет | Случайная строка для защиты от CSRF атак |

### Поведение

1. **Если пользователь НЕ авторизован:**
   - OAuth параметры сохраняются в cookies (httpOnly, secure в production)
   - Автоматический редирект `302 Found` на страницу авторизации Loginus:
     ```
     https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/oauth/authorize&client_id=ai-aggregator
     ```
   - После успешной авторизации/регистрации (Email/GitHub/Telegram) Loginus автоматически продолжает OAuth flow

2. **Если пользователь авторизован:**
   - Создается authorization code
   - Редирект на `redirect_uri` с параметрами:
     - `code` - authorization code
     - `state` - тот же state, что был отправлен (если был указан)

### Пример запроса

```
GET /oauth/authorize?client_id=ai-aggregator&redirect_uri=http://localhost:80/auth/callback&response_type=code&scope=openid%20email%20profile&state=random_state_string
```

### Пример успешного ответа (авторизован)

```
HTTP/1.1 302 Found
Location: http://localhost:80/auth/callback?code=abc123def456&state=random_state_string
```

### Пример ответа (неавторизован - новый flow)

```
HTTP/1.1 302 Found
Location: https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/oauth/authorize&client_id=ai-aggregator
Set-Cookie: oauth_client_id=ai-aggregator; HttpOnly; SameSite=Lax; Max-Age=600
Set-Cookie: oauth_redirect_uri=http://localhost:80/auth/callback; HttpOnly; SameSite=Lax; Max-Age=600
Set-Cookie: oauth_scope=openid email profile; HttpOnly; SameSite=Lax; Max-Age=600
Set-Cookie: oauth_state_param=random_state_string; HttpOnly; SameSite=Lax; Max-Age=600
```

### Cookies, сохраняемые при неавторизованном пользователе

| Cookie | Значение | Описание |
|--------|----------|----------|
| `oauth_client_id` | string | ID клиента |
| `oauth_redirect_uri` | string | URL для редиректа |
| `oauth_scope` | string | Запрашиваемые разрешения |
| `oauth_state_param` | string | CSRF защита (если был указан) |

**Время жизни:** 10 минут (600000 мс)

---

## Полный Flow с регистрацией и авторизацией

### Сценарий 1: Новый пользователь (регистрация)

```
1. AI Aggregator → GET /oauth/authorize?client_id=...&redirect_uri=...&state=...
   ↓
2. Loginus → Пользователь НЕ авторизован
   ↓
3. Loginus → Редирект на /index.html?oauth_flow=true&return_to=/oauth/authorize&client_id=...
   (OAuth параметры сохранены в cookies)
   ↓
4. Пользователь выбирает способ регистрации:
   - Email + пароль
   - GitHub OAuth
   - Telegram Login Widget
   ↓
5. После успешной регистрации Loginus:
   - Проверяет наличие oauth_flow=true и cookies
   - Редирект на /oauth/authorize (с восстановленными параметрами из cookies)
   ↓
6. Loginus → Пользователь авторизован → Создается authorization code
   ↓
7. Редирект на redirect_uri?code=...&state=...
   ↓
8. AI Aggregator → Обмен code на access_token
   ↓
9. AI Aggregator → Получение userinfo
   ↓
10. Синхронизация пользователя в AI Aggregator
```

### Сценарий 2: Существующий пользователь (авторизация)

```
1. AI Aggregator → GET /oauth/authorize?client_id=...&redirect_uri=...&state=...
   ↓
2. Loginus → Пользователь НЕ авторизован
   ↓
3. Loginus → Редирект на /index.html?oauth_flow=true&return_to=/oauth/authorize
   ↓
4. Пользователь выбирает способ входа:
   - Email + пароль
   - GitHub OAuth
   - Telegram Login Widget
   ↓
5. После успешной авторизации → Редирект на /oauth/authorize
   ↓
6. OAuth flow продолжается (как в сценарии 1, начиная с шага 6)
```

### Сценарий 3: Пользователь уже авторизован в Loginus

```
1. AI Aggregator → GET /oauth/authorize?client_id=...&redirect_uri=...&state=...
   ↓
2. Loginus → Пользователь авторизован (есть валидный Bearer token)
   ↓
3. Loginus → Создается authorization code
   ↓
4. Редирект на redirect_uri?code=...&state=...
   ↓
5. AI Aggregator → Обмен code на access_token
   ↓
6. AI Aggregator → Получение userinfo
```

---

## Структура базы данных

### Таблица `users`

Основная таблица пользователей с поддержкой мульти-аутентификации.

#### Основные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор пользователя |
| `email` | VARCHAR(255) | Email пользователя (nullable для OAuth пользователей) |
| `passwordHash` | VARCHAR(255) | Хеш пароля (nullable для OAuth пользователей) |
| `firstName` | VARCHAR(100) | Имя |
| `lastName` | VARCHAR(100) | Фамилия |
| `avatarUrl` | VARCHAR(500) | URL аватара |
| `phone` | VARCHAR(20) | Телефон (nullable) |

#### Поля для GitHub OAuth

| Поле | Тип | Описание |
|------|-----|----------|
| `githubId` | VARCHAR(255) | GitHub ID пользователя (nullable) |
| `githubUsername` | VARCHAR(255) | GitHub username (nullable) |
| `githubVerified` | BOOLEAN | Статус верификации GitHub (default: false) |

#### Поля для мульти-аутентификации

| Поле | Тип | Описание |
|------|-----|----------|
| `primaryAuthMethod` | ENUM | Основной способ входа (EMAIL, GITHUB, PHONE_TELEGRAM, и т.д.) |
| `availableAuthMethods` | JSONB | Массив доступных способов аутентификации (default: ["EMAIL"]) |

**Пример `availableAuthMethods`:**
```json
["EMAIL", "GITHUB"]
```

#### Поля верификации

| Поле | Тип | Описание |
|------|-----|----------|
| `emailVerified` | BOOLEAN | Email подтвержден (default: false) |
| `phoneVerified` | BOOLEAN | Телефон подтвержден (default: false) |
| `githubVerified` | BOOLEAN | GitHub подтвержден (default: false) |
| `gosuslugiVerified` | BOOLEAN | Госуслуги подтверждены (default: false) |
| `vkontakteVerified` | BOOLEAN | VKontakte подтвержден (default: false) |

#### JSONB поля

##### `oauthMetadata` (JSONB, nullable)

Метаданные от OAuth провайдеров.

**Структура:**
```typescript
{
  github?: {
    provider: "github";
    providerId: string;          // GitHub ID пользователя
    username: string;            // GitHub username (login)
    avatarUrl?: string;           // URL аватара GitHub
    profileUrl?: string;          // URL профиля GitHub (html_url)
    accessToken?: string;        // Access token для GitHub API
    refreshToken?: string;       // Refresh token (если есть)
    tokenExpiresAt?: Date;       // Дата истечения токена
    scopes?: string[];           // Разрешения (например: ["user:email"])
  };
  gosuslugi?: {
    provider: "gosuslugi";
    providerId: string;
    // ... другие поля
  };
  vkontakte?: {
    provider: "vkontakte";
    providerId: string;
    // ... другие поля
  };
}
```

**Пример для GitHub:**
```json
{
  "github": {
    "provider": "github",
    "providerId": "12345678",
    "username": "octocat",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678?v=4",
    "profileUrl": "https://github.com/octocat",
    "accessToken": "gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "scopes": ["user:email"]
  }
}
```

##### `messengerMetadata` (JSONB, nullable)

Метаданные мессенджеров (Telegram, WhatsApp).

**Структура:**
```typescript
{
  whatsapp?: {
    phoneNumber: string;
    profileName?: string;
  };
  telegram?: {
    userId: string;              // Telegram User ID (число в виде строки)
    username?: string;           // Telegram username (без @)
  };
}
```

**Пример для Telegram:**
```json
{
  "telegram": {
    "userId": "123456789",
    "username": "johndoe"
  }
}
```

**Важно:** `userId` в `messengerMetadata.telegram` хранится как строка, хотя в Telegram API это число.

#### Дополнительные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `isActive` | BOOLEAN | Активен ли пользователь (default: true) |
| `mfaSettings` | JSONB | Настройки многофакторной аутентификации (nullable) |
| `messengerPreferences` | JSONB | Предпочтения мессенджеров (nullable) |
| `createdAt` | TIMESTAMP | Дата создания |
| `updatedAt` | TIMESTAMP | Дата обновления |

---

## Таблица `oauth_clients`

Таблица зарегистрированных OAuth клиентов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `clientId` | VARCHAR(255) | ID клиента (уникальный) |
| `clientSecret` | VARCHAR(255) | Секретный ключ клиента |
| `name` | VARCHAR(255) | Название клиента |
| `redirectUris` | TEXT[] | Массив разрешенных redirect URI |
| `scopes` | TEXT[] | Массив поддерживаемых scopes |
| `isActive` | BOOLEAN | Активен ли клиент (default: true) |
| `createdAt` | TIMESTAMP | Дата создания |
| `updatedAt` | TIMESTAMP | Дата обновления |

**Пример:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "clientId": "ai-aggregator",
  "clientSecret": "secret_key_here",
  "name": "AI Aggregator",
  "redirectUris": ["http://localhost:80/auth/callback", "https://ai-aggregator.com/auth/callback"],
  "scopes": ["openid", "email", "profile"],
  "isActive": true
}
```

---

## Таблица `authorization_codes`

Таблица временных authorization codes для OAuth flow.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `code` | VARCHAR(255) | Authorization code (уникальный) |
| `userId` | UUID | ID пользователя |
| `clientId` | VARCHAR(255) | ID клиента |
| `redirectUri` | VARCHAR(500) | Redirect URI, использованный при создании |
| `scopes` | TEXT[] | Запрашиваемые разрешения |
| `state` | VARCHAR(255) | CSRF защита (nullable) |
| `expiresAt` | TIMESTAMP | Дата истечения (10 минут) |
| `isUsed` | BOOLEAN | Использован ли код (default: false) |
| `createdAt` | TIMESTAMP | Дата создания |

**Важно:** Authorization code действителен только 10 минут и может быть использован только один раз.

---

## Интеграция с GitHub OAuth

### Как работает GitHub OAuth в Loginus

1. Пользователь нажимает "Войти через GitHub" на странице Loginus
2. Loginus перенаправляет на GitHub OAuth
3. После успешной авторизации GitHub возвращает код
4. Loginus обменивает код на access token
5. Loginus получает данные пользователя и email из GitHub API
6. Создается или обновляется пользователь в Loginus:
   - `githubId` = GitHub ID
   - `githubUsername` = GitHub username
   - `githubVerified` = true
   - `oauthMetadata.github` = метаданные GitHub
   - `availableAuthMethods` += "GITHUB"

### Данные, доступные через `/oauth/userinfo` после GitHub авторизации

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",           // Из GitHub (если есть)
  "firstName": "John",
  "lastName": "Doe",
  "phone": null,
  "isVerified": true,                    // emailVerified && phoneVerified
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Примечание:** Если пользователь авторизовался только через GitHub без email, `email` может быть `null` или псевдо-email вида `username@github.local`.

---

## Интеграция с Telegram OAuth

### Как работает Telegram Login Widget в Loginus

1. Пользователь авторизуется через Telegram Login Widget на странице Loginus
2. Telegram отправляет данные пользователя (id, username, first_name, last_name, photo_url, auth_date, hash)
3. Loginus проверяет hash для безопасности
4. Создается или обновляется пользователь в Loginus:
   - `email` = `username@telegram.local` или `telegram_{id}@local`
   - `primaryAuthMethod` = "PHONE_TELEGRAM"
   - `availableAuthMethods` = ["PHONE_TELEGRAM"]
   - `messengerMetadata.telegram` = { userId, username }
   - `emailVerified` = true (Telegram считается подтвержденным)

### Данные, доступные через `/oauth/userinfo` после Telegram авторизации

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "johndoe@telegram.local",     // Псевдо-email
  "firstName": "John",
  "lastName": "Doe",
  "phone": null,
  "isVerified": true,                    // emailVerified = true для Telegram
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Примечание:** Telegram не предоставляет email, поэтому используется псевдо-email. Если пользователь привяжет email позже, он будет обновлен.

---

## Примеры использования

### Пример 1: Полный flow с регистрацией через GitHub

```javascript
// 1. Инициация OAuth flow
const state = generateRandomString();
const authUrl = `https://vselena.ldmco.ru/oauth/authorize?` +
  `client_id=ai-aggregator&` +
  `redirect_uri=${encodeURIComponent('http://localhost:80/auth/callback')}&` +
  `response_type=code&` +
  `scope=openid email profile&` +
  `state=${state}`;

// Перенаправление пользователя
window.location.href = authUrl;

// 2. На callback странице (после успешной авторизации)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const receivedState = urlParams.get('state');

// Проверка state
if (receivedState !== state) {
  throw new Error('CSRF attack detected');
}

// 3. Обмен code на токен (на сервере!)
const tokenResponse = await fetch('https://vselena.ldmco.ru/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'http://localhost:80/auth/callback',
    client_id: 'ai-aggregator',
    client_secret: 'your_client_secret', // Только на сервере!
  }),
});

const tokens = await tokenResponse.json();
// {
//   "access_token": "...",
//   "token_type": "Bearer",
//   "expires_in": 3600,
//   "refresh_token": "...",
//   "id_token": "..."
// }

// 4. Получение информации о пользователе
const userInfoResponse = await fetch('https://vselena.ldmco.ru/oauth/userinfo', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`,
  },
});

const userInfo = await userInfoResponse.json();
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "email": "user@example.com",
//   "firstName": "John",
//   "lastName": "Doe",
//   "phone": null,
//   "isVerified": true,
//   "createdAt": "2024-01-01T00:00:00.000Z"
// }

// 5. Синхронизация пользователя в AI Aggregator
// (создание или обновление пользователя в вашей БД)
```

---

## Важные замечания

### 1. Email может быть null или псевдо-email

- Пользователи, зарегистрированные только через Telegram, имеют псевдо-email вида `username@telegram.local` или `telegram_{id}@local`
- Пользователи, зарегистрированные только через GitHub без публичного email, могут иметь псевдо-email `username@github.local`
- AI Aggregator должен учитывать это при синхронизации пользователей

### 2. Множественные способы аутентификации

Один пользователь может иметь несколько способов входа:
- Email + пароль
- GitHub
- Telegram

Это отражается в поле `availableAuthMethods`:
```json
["EMAIL", "GITHUB", "PHONE_TELEGRAM"]
```

### 3. Автоматическое продолжение OAuth flow

После успешной авторизации/регистрации через любой способ (Email/GitHub/Telegram), если пользователь был перенаправлен с `oauth_flow=true`, Loginus автоматически продолжает OAuth flow и редиректит на `/oauth/authorize`.

### 4. Проверка верификации

Поле `isVerified` в `/oauth/userinfo` означает `emailVerified && phoneVerified`. Для пользователей, зарегистрированных только через GitHub или Telegram, `emailVerified` может быть `true`, но `phoneVerified` = `false`, поэтому `isVerified` = `false`.

---

## Контакты

Для регистрации OAuth клиента или получения дополнительной информации обращайтесь к администратору Loginus.

