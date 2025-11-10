# Ответ для разработчика SV_ERP_Backend

## По поводу redirect URI и порта

**Важно:** `redirect_uri` - это URL **вашего сервиса** (SV_ERP_Backend), а не Loginus!

Loginus развернут на `https://vselena.ldmco.ru`, но это не имеет значения для redirect URI. Redirect URI - это адрес, на который Loginus будет перенаправлять пользователя **после авторизации** в вашем сервисе.

## Какой порт использовать?

Для **локальной разработки** вы можете использовать **любой порт**, который вам удобен:
- `http://localhost:8080/auth/callback`
- `http://localhost:5173/auth/callback`
- `http://localhost:3000/auth/callback`
- Или любой другой порт, который вы используете

**Главное:** Этот URL должен быть зарегистрирован в Loginus как разрешенный redirect URI.

## Регистрация OAuth клиента

Вам нужно зарегистрировать OAuth клиента в Loginus с **несколькими redirect URIs**:

1. **Для разработки:** `http://localhost:8080/auth/callback` (или любой другой порт)
2. **Для production:** `https://your-production-domain.com/auth/callback`

### Способ 1: Через API (если у вас есть доступ к админ-токену Loginus)

```http
POST https://vselena.ldmco.ru/api/oauth/clients/register
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "name": "SV ERP Backend",
  "redirect_uris": [
    "http://localhost:8080/auth/callback",
    "https://your-production-domain.com/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

**Ответ:**
```json
{
  "client_id": "your-client-id-here",
  "client_secret": "your-client-secret-here",
  "name": "SV ERP Backend",
  "redirect_uris": [
    "http://localhost:8080/auth/callback",
    "https://your-production-domain.com/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

### Способ 2: Обратиться к администратору Loginus

Если у вас нет доступа к админ-токену, обратитесь к администратору Loginus с запросом на регистрацию клиента. Укажите:
- Название сервиса: "SV ERP Backend"
- Redirect URIs:
  - `http://localhost:8080/auth/callback` (для разработки)
  - `https://your-production-domain.com/auth/callback` (для production)

## Настройка переменных окружения

После регистрации клиента настройте переменные окружения:

### На фронте (если используете Vite):

```env
VITE_LOGINUS_CLIENT_ID=your-client-id-here
VITE_LOGINUS_REDIRECT_URI=http://localhost:8080/auth/callback  # для разработки
# или
VITE_LOGINUS_REDIRECT_URI=https://your-production-domain.com/auth/callback  # для production
VITE_LOGINUS_AUTH_URL=https://vselena.ldmco.ru/api/oauth/authorize
```

### На бэке:

```env
LOGINUS_CLIENT_ID=your-client-id-here
LOGINUS_CLIENT_SECRET=your-client-secret-here  # ТОЛЬКО на бэке, никогда на фронте!
LOGINUS_REDIRECT_URI=http://localhost:8080/auth/callback  # для разработки
# или
LOGINUS_REDIRECT_URI=https://your-production-domain.com/auth/callback  # для production
LOGINUS_TOKEN_URL=https://vselena.ldmco.ru/api/oauth/token
LOGINUS_USERINFO_URL=https://vselena.ldmco.ru/api/oauth/userinfo
```

## Важные моменты

1. **Redirect URI должен точно совпадать** с зарегистрированным в Loginus (включая протокол, домен, порт и путь)
2. **Для production используйте HTTPS** - `http://localhost` разрешен только для разработки
3. **client_secret храните только на бэке**, никогда не передавайте его на фронт
4. **Можно зарегистрировать несколько redirect URIs** для одного клиента (dev и production)

## Пример OAuth flow

1. Пользователь нажимает "Войти через Loginus" в вашем сервисе
2. Ваш сервис перенаправляет на:
   ```
   https://vselena.ldmco.ru/api/oauth/authorize?
     client_id=your-client-id&
     redirect_uri=http://localhost:8080/auth/callback&
     response_type=code&
     scope=openid email profile&
     state=random-state-string
   ```
3. Пользователь авторизуется в Loginus
4. Loginus перенаправляет на **ваш** `redirect_uri`:
   ```
   http://localhost:8080/auth/callback?code=AUTHORIZATION_CODE&state=random-state-string
   ```
5. Ваш бэкенд обменивает `code` на `access_token` через `/oauth/token`
6. Ваш бэкенд получает информацию о пользователе через `/oauth/userinfo`

## Документация

Полная документация по интеграции:
- [LOGINUS_OAUTH_QUICK_START.md](./LOGINUS_OAUTH_QUICK_START.md) - быстрый старт
- [LOGINUS_OAUTH_INTEGRATION_GUIDE.md](./LOGINUS_OAUTH_INTEGRATION_GUIDE.md) - полное руководство

## Контакты

Если нужна помощь с регистрацией клиента, обратитесь к администратору Loginus.

