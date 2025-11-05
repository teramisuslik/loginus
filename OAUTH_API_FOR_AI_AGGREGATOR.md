# OAuth API для AI Aggregator

Документация по OAuth endpoints сервиса Loginus для интеграции с AI Aggregator.

**Base URL:** `https://vselena.ldmco.ru` (или `http://45.144.176.42:3001` для тестирования)

---

## 1. GET /oauth/authorize

Инициация OAuth flow. Перенаправляет пользователя на страницу авторизации или возвращает authorization code.

### Параметры запроса (Query Parameters)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `client_id` | string | Да | ID клиента (AI Aggregator) |
| `redirect_uri` | string | Да | URL для редиректа после авторизации (должен быть зарегистрирован для клиента) |
| `response_type` | string | Да | Тип ответа (должен быть `code` для Authorization Code flow) |
| `scope` | string | Нет | Запрашиваемые разрешения через пробел (по умолчанию: `openid email profile`) |
| `state` | string | Нет | Случайная строка для защиты от CSRF атак |

### Пример запроса

```
GET /oauth/authorize?client_id=ai-aggregator&redirect_uri=http://localhost:80/auth/callback&response_type=code&scope=openid%20email%20profile&state=random_state_string
```

### Поведение

1. **Если пользователь НЕ авторизован:**
   - Возвращает ошибку `401 Unauthorized` с сообщением: "User must be authenticated first. Please login and then retry the OAuth flow."
   - Параметры OAuth сохраняются в cookies для последующего использования

2. **Если пользователь авторизован:**
   - Возвращает редирект `302 Found` на `redirect_uri` с параметрами:
     - `code` - authorization code (используется для получения токена)
     - `state` - тот же state, что был отправлен (если был указан)

### Пример успешного ответа

```
HTTP/1.1 302 Found
Location: http://localhost:80/auth/callback?code=abc123def456&state=random_state_string
```

### Пример ошибки (неавторизован)

```json
{
  "statusCode": 401,
  "message": "User must be authenticated first. Please login and then retry the OAuth flow.",
  "error": "Unauthorized"
}
```

### Пример ошибки (неверные параметры)

```json
{
  "statusCode": 400,
  "message": "Invalid redirect_uri for this client",
  "error": "Bad Request"
}
```

---

## 2. POST /oauth/token

Обмен authorization code на access token и refresh token.

### Параметры запроса (application/x-www-form-urlencoded)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `grant_type` | string | Да | Тип grant (должен быть `authorization_code`) |
| `code` | string | Да | Authorization code, полученный из `/oauth/authorize` |
| `redirect_uri` | string | Да | Тот же redirect_uri, что использовался в `/oauth/authorize` |
| `client_id` | string | Да | ID клиента |
| `client_secret` | string | Да | Секретный ключ клиента |

### Пример запроса

```http
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=abc123def456&redirect_uri=http://localhost:80/auth/callback&client_id=ai-aggregator&client_secret=your_client_secret
```

### Ответ (успешный)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `access_token` | string | JWT токен для доступа к API (действителен 1 час) |
| `token_type` | string | Тип токена (всегда `Bearer`) |
| `expires_in` | number | Время жизни токена в секундах (3600 = 1 час) |
| `refresh_token` | string | Токен для обновления access_token (опционально) |
| `id_token` | string | JWT токен с информацией о пользователе |

### Пример ошибки

```json
{
  "statusCode": 400,
  "message": "Invalid or expired authorization code",
  "error": "Bad Request"
}
```

---

## 3. GET /oauth/userinfo

Получение информации о пользователе по access token.

### Headers

| Header | Значение | Обязательный |
|--------|----------|--------------|
| `Authorization` | `Bearer {access_token}` | Да |

### Пример запроса

```http
GET /oauth/userinfo HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Ответ (успешный)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+79991234567",
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | UUID пользователя |
| `email` | string | Email пользователя |
| `firstName` | string | Имя пользователя |
| `lastName` | string | Фамилия пользователя |
| `phone` | string | Телефон пользователя (опционально) |
| `isVerified` | boolean | Статус верификации (email и телефон подтверждены) |
| `createdAt` | string | Дата создания аккаунта (ISO 8601) |

### Пример ошибки

```json
{
  "statusCode": 401,
  "message": "Invalid access token",
  "error": "Unauthorized"
}
```

---

## 4. POST /oauth/logout

Выход из системы OAuth (опциональный endpoint).

### Параметры запроса (JSON)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `token` | string | Нет | Access token или refresh token для инвалидации |
| `redirect_uri` | string | Нет | URL для редиректа после выхода |

### Пример запроса

```http
POST /oauth/logout HTTP/1.1
Content-Type: application/json

{
  "token": "access_token_here",
  "redirect_uri": "http://localhost:80"
}
```

### Ответ (успешный)

Если указан `redirect_uri`:
```
HTTP/1.1 302 Found
Location: http://localhost:80
```

Если `redirect_uri` не указан:
```json
{
  "message": "Logged out successfully"
}
```

---

## Полный Flow интеграции

### Шаг 1: Регистрация клиента в Loginus

Перед использованием OAuth необходимо зарегистрировать AI Aggregator как OAuth клиента:

1. Обратиться к администратору Loginus для регистрации клиента
2. Получить `client_id` и `client_secret`
3. Указать разрешенные `redirect_uri` (например: `http://localhost:80/auth/callback` для dev и `https://yourdomain.com/auth/callback` для production)

### Шаг 2: Инициация OAuth flow

AI Aggregator перенаправляет пользователя на:
```
GET /oauth/authorize?client_id=ai-aggregator&redirect_uri=http://localhost:80/auth/callback&response_type=code&scope=openid%20email%20profile&state=random_state_string
```

**Важно:** Пользователь должен быть авторизован в Loginus перед вызовом этого endpoint. Если пользователь не авторизован, он должен сначала войти в систему Loginus.

### Шаг 3: Получение authorization code

После успешной авторизации Loginus перенаправляет на `redirect_uri` с параметрами:
```
http://localhost:80/auth/callback?code=abc123def456&state=random_state_string
```

AI Aggregator должен:
1. Проверить `state` (защита от CSRF)
2. Сохранить `code` для обмена на токен

### Шаг 4: Обмен code на access token

AI Aggregator отправляет POST запрос:
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=abc123def456&redirect_uri=http://localhost:80/auth/callback&client_id=ai-aggregator&client_secret=your_client_secret
```

Получает `access_token`, `refresh_token` и `id_token`.

### Шаг 5: Получение информации о пользователе

AI Aggregator использует `access_token` для получения информации о пользователе:
```http
GET /oauth/userinfo
Authorization: Bearer {access_token}
```

### Шаг 6: Использование токена

AI Aggregator может использовать `access_token` для аутентификации пользователя в своей системе или сохранить его для последующих запросов к Loginus API.

---

## Безопасность

1. **HTTPS обязателен** для production окружения
2. **`client_secret`** должен храниться только на сервере, никогда не передаваться в клиентский код
3. **`state` параметр** обязателен для защиты от CSRF атак
4. **`redirect_uri`** должен точно совпадать с зарегистрированным для клиента
5. **Authorization code** действителен только 10 минут
6. **Access token** действителен 1 час (3600 секунд)

---

## Обработка ошибок

### Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request - неверные параметры запроса |
| 401 | Unauthorized - пользователь не авторизован или токен невалиден |
| 404 | Not Found - OAuth клиент не найден |
| 500 | Internal Server Error - ошибка на стороне сервера |

### Примеры обработки ошибок

```javascript
// Пример на JavaScript
try {
  const response = await fetch('https://vselena.ldmco.ru/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OAuth error:', error.message);
    // Обработка ошибки
    return;
  }

  const tokens = await response.json();
  // Использование токенов
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Пример полной интеграции (псевдокод)

```javascript
// 1. Генерируем state для CSRF защиты
const state = generateRandomString();

// 2. Перенаправляем пользователя на Loginus
window.location.href = `https://vselena.ldmco.ru/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=openid email profile&` +
  `state=${state}`;

// 3. На callback странице получаем code
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const receivedState = urlParams.get('state');

// 4. Проверяем state
if (receivedState !== state) {
  throw new Error('CSRF attack detected');
}

// 5. Обмениваем code на токен (на сервере!)
const tokens = await exchangeCodeForToken(code);

// 6. Получаем информацию о пользователе
const userInfo = await getUserInfo(tokens.access_token);

// 7. Сохраняем токен и информацию о пользователе
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('user_info', JSON.stringify(userInfo));
```

---

## Примечания

- **Authorization code** может быть использован только один раз
- **Access token** содержит информацию о пользователе в payload (JWT)
- **Id token** также содержит информацию о пользователе (JWT)
- Все временные метки в формате ISO 8601 (UTC)
- Все UUID в стандартном формате (например: `550e8400-e29b-41d4-a716-446655440000`)

---

## Контакты

Для регистрации OAuth клиента или получения дополнительной информации обращайтесь к администратору Loginus.

