# OAuth Credentials для AI Aggregator

## 🔑 Credentials

Используйте следующие credentials для интеграции с Loginus OAuth:

```bash
LOGINUS_CLIENT_ID=ai-aggregator-1dfc0546e55a761187a9e64d034c982c
LOGINUS_CLIENT_SECRET=cd024fc585ac2008b767e3c46f41123bd618fd0ab1af7a10158549b405ae9d37
```

## 🌐 Base URL

**Production:**
```
https://vselena.ldmco.ru/api
```

**Development (если доступен):**
```
http://localhost:3001/api
```

## 📋 OAuth Endpoints

### 1. Authorization Endpoint
**GET** `/oauth/authorize`

Инициирует OAuth flow. Пользователь будет перенаправлен на страницу авторизации Loginus.

**Параметры:**
- `client_id` (required) - Ваш `LOGINUS_CLIENT_ID`
- `redirect_uri` (required) - URL для перенаправления после авторизации (должен быть зарегистрирован в `redirectUris`)
- `response_type` (required) - Должно быть `code`
- `scope` (optional) - Запрошенные scopes (по умолчанию: `openid email profile`)
- `state` (optional) - CSRF защита, случайная строка

**Пример:**
```
GET https://vselena.ldmco.ru/api/oauth/authorize?client_id=ai-aggregator-1dfc0546e55a761187a9e64d034c982c&redirect_uri=http://localhost:80/v1/auth/callback&response_type=code&scope=openid%20email%20profile&state=random-state-string
```

**Ответ:**
- При успехе: редирект на `redirect_uri` с параметром `code` и `state`
- Если пользователь не авторизован: редирект на страницу входа Loginus

---

### 2. Token Endpoint
**POST** `/oauth/token`

Обменивает authorization code на access token.

**Параметры (form-data или JSON):**
- `grant_type` (required) - Должно быть `authorization_code`
- `code` (required) - Authorization code, полученный из предыдущего шага
- `redirect_uri` (required) - Тот же redirect_uri, что использовался в authorize
- `client_id` (required) - Ваш `LOGINUS_CLIENT_ID`
- `client_secret` (required) - Ваш `LOGINUS_CLIENT_SECRET`

**Пример запроса:**
```http
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=abc123...&redirect_uri=http://localhost:80/v1/auth/callback&client_id=ai-aggregator-1dfc0546e55a761187a9e64d034c982c&client_secret=cd024fc585ac2008b767e3c46f41123bd618fd0ab1af7a10158549b405ae9d37
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. UserInfo Endpoint
**GET** `/oauth/userinfo`

Получает информацию о пользователе по access token.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Пример запроса:**
```http
GET /api/oauth/userinfo
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "phone": "+1234567890",
  "phone_verified": true,
  "roles": ["user"],
  "github_id": "123456",
  "github_username": "johndoe",
  "telegram_id": "987654321",
  "telegram_username": "@johndoe"
}
```

---

### 4. Logout Endpoint (опционально)
**POST** `/oauth/logout`

Выход из системы.

**Параметры:**
- `token` (optional) - Access token для инвалидации
- `redirect_uri` (optional) - URL для перенаправления после выхода

---

## 🔄 Полный OAuth Flow

1. **Пользователь нажимает "Войти через Loginus"**
   - Перенаправьте на `/oauth/authorize` с параметрами

2. **Пользователь авторизуется в Loginus**
   - Если не авторизован, он будет перенаправлен на страницу входа
   - После успешной авторизации он будет перенаправлен обратно на ваш `redirect_uri` с `code`

3. **Обмен code на token**
   - Используйте `code` для получения `access_token` через `/oauth/token`

4. **Получение информации о пользователе**
   - Используйте `access_token` для получения данных пользователя через `/oauth/userinfo`

5. **Сохранение сессии**
   - Сохраните `access_token` и `refresh_token` в вашей системе
   - Используйте `access_token` для последующих запросов к Loginus API

---

## 🔒 Security Best Practices

1. **Храните `client_secret` в безопасном месте** (environment variables, secrets manager)
2. **Используйте `state` параметр** для защиты от CSRF атак
3. **Валидируйте `redirect_uri`** - проверяйте, что он соответствует зарегистрированным
4. **Используйте HTTPS** для всех запросов
5. **Храните токены безопасно** - не передавайте их в URL или логах
6. **Используйте refresh token** для обновления access token без повторной авторизации

---

## 📝 Registered Redirect URIs

Следующие redirect URIs зарегистрированы для вашего клиента:
- `http://localhost:80/v1/auth/callback` (новый, для разработки) ⭐
- `http://localhost:80/auth/callback` (старый, для обратной совместимости)
- `https://yourdomain.com/auth/callback` (замените на ваш production домен)

**Чтобы добавить новый redirect URI**, обратитесь к администратору Loginus или используйте endpoint `/oauth/clients/register` (требует админских прав).

---

## 🐛 Troubleshooting

### Ошибка: "invalid_client"
- Проверьте, что `client_id` и `client_secret` правильные
- Убедитесь, что клиент активен в базе данных

### Ошибка: "invalid_redirect_uri"
- Проверьте, что `redirect_uri` точно совпадает с зарегистрированным (включая протокол и порт)
- Убедитесь, что URI не содержит лишних слешей или параметров

### Ошибка: "invalid_grant"
- Authorization code может быть использован только один раз
- Code может быть просрочен (обычно действует 10 минут)
- Проверьте, что `redirect_uri` совпадает с тем, что использовался в authorize

### Ошибка: "unauthorized_client"
- Проверьте, что клиент активен (`isActive = true`)
- Убедитесь, что используете правильные credentials

---

## 📞 Support

Если у вас возникли проблемы, обратитесь к администратору Loginus или создайте issue в репозитории проекта.

---

**Дата создания:** 2025-01-27
**Client ID:** `ai-aggregator-1dfc0546e55a761187a9e64d034c982c`
**Client Name:** AI Aggregator

