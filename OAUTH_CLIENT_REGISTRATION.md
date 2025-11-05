# Регистрация OAuth клиента для AI Aggregator

## Способ 1: Через API endpoint (требует авторизации админа)

### Endpoint: `POST /oauth/clients/register`

**Требования:**
- Авторизация с JWT токеном администратора (`super_admin` или `admin` роль)
- Headers: `Authorization: Bearer {admin_jwt_token}`

**Запрос:**
```http
POST /api/oauth/clients/register
Content-Type: application/json
Authorization: Bearer {admin_jwt_token}

{
  "name": "AI Aggregator",
  "redirect_uris": [
    "http://localhost:80/auth/callback",
    "https://yourdomain.com/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

**Ответ:**
```json
{
  "client_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "client_secret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "name": "AI Aggregator",
  "redirect_uris": [
    "http://localhost:80/auth/callback",
    "https://yourdomain.com/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

**Важно:** Сохраните `client_secret` сразу, он больше не будет показан!

---

## Способ 2: Напрямую в базе данных (для быстрого тестирования)

Если нужно быстро создать клиента для тестирования, можно выполнить SQL запрос:

```sql
INSERT INTO oauth_clients (id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'ai-aggregator-client-id',
  'ai-aggregator-client-secret-change-this-in-production',
  'AI Aggregator',
  ARRAY['http://localhost:80/auth/callback', 'https://yourdomain.com/auth/callback'],
  ARRAY['openid', 'email', 'profile'],
  true,
  NOW(),
  NOW()
);
```

**Важно:** Замените `ai-aggregator-client-id` и `ai-aggregator-client-secret-change-this-in-production` на безопасные значения!

---

## Способ 3: Через скрипт (Node.js)

Создайте файл `create-client.js`:

```javascript
const { OAuthService } = require('./dist/auth/services/oauth.service');
// ... инициализация сервиса

async function createClient() {
  const result = await oauthService.registerClient(
    'AI Aggregator',
    ['http://localhost:80/auth/callback', 'https://yourdomain.com/auth/callback'],
    ['openid', 'email', 'profile']
  );
  
  console.log('Client ID:', result.clientId);
  console.log('Client Secret:', result.clientSecret);
}

createClient();
```

---

## Использование в AI Aggregator

После получения `client_id` и `client_secret`, добавьте их в переменные окружения AI Aggregator:

```env
LOGINUS_CLIENT_ID=your_client_id_here
LOGINUS_CLIENT_SECRET=your_client_secret_here
LOGINUS_OAUTH_URL=https://vselena.ldmco.ru
LOGINUS_REDIRECT_URI=http://localhost:80/auth/callback
LOGINUS_SCOPE=openid email profile
```

---

## Проверка через Swagger UI

1. Откройте `https://vselena.ldmco.ru/api/docs`
2. Найдите endpoint `POST /oauth/clients/register`
3. Нажмите "Authorize" и введите JWT токен администратора
4. Заполните форму:
   - `name`: "AI Aggregator"
   - `redirect_uris`: `["http://localhost:80/auth/callback"]`
   - `scopes`: `["openid", "email", "profile"]` (опционально)
5. Выполните запрос
6. Сохраните полученные `client_id` и `client_secret`

---

## Безопасность

⚠️ **Важно:**
- `client_secret` должен храниться только на сервере AI Aggregator
- Никогда не передавайте `client_secret` в клиентский код (JavaScript)
- Используйте HTTPS в production
- Регулярно ротируйте `client_secret` при подозрении на компрометацию
- Используйте разные `client_id` для development и production окружений

