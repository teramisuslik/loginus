# Документация: Flow редиректов после авторизации через пароль, GitHub и Telegram

## Общая схема OAuth 2.0 flow

Loginus работает как **OAuth 2.0 Authorization Server** для других сервисов. После успешной авторизации пользователя (через пароль, GitHub или Telegram), Loginus создает **authorization code** и редиректит пользователя обратно на сайт сервиса с этим кодом.

---

## 1. Вход через Email/Пароль

### Шаг 1: Инициализация OAuth flow
1. **Сервис** редиректит пользователя на:
   ```
   https://loginus.startapus.com/api/oauth/authorize?client_id=XXX&redirect_uri=YYY&response_type=code&scope=openid&state=ZZZ
   ```

2. **Backend** (`oauth.controller.ts`, метод `authorize`):
   - Проверяет, авторизован ли пользователь
   - Если **НЕ авторизован** → редиректит на `index.html?oauth_flow=true&return_to=/api/oauth/authorize&client_id=XXX`
   - Сохраняет OAuth параметры в **cookies**:
     - `oauth_flow_active=true`
     - `oauth_client_id=XXX`
     - `oauth_redirect_uri=YYY`
     - `oauth_scope=...`
     - `oauth_state_param=ZZZ`

### Шаг 2: Авторизация на frontend
3. **Frontend** (`index.html`):
   - При загрузке страницы сохраняет OAuth параметры в **sessionStorage**
   - Пользователь вводит email и пароль
   - Отправляет POST запрос на `/api/auth/login`

4. **Backend** (`auth.controller.ts`, метод `login`):
   - Проверяет credentials
   - Если успешно → генерирует JWT токены
   - Если это OAuth flow (есть cookies) → устанавливает `temp_access_token` cookie
   - Возвращает JSON с токенами

5. **Frontend** (`index.html`, после успешного login):
   - Сохраняет токены в localStorage
   - Проверяет наличие OAuth параметров (из URL, sessionStorage, cookies)
   - Если OAuth flow → редиректит на `/api/oauth/authorize` с параметрами:
     ```javascript
     window.location.href = `${apiBaseUrl}/api/oauth/authorize?client_id=XXX&redirect_uri=YYY&...`
     ```

### Шаг 3: Создание authorization code и редирект на сервис
6. **Backend** (`oauth.controller.ts`, метод `authorize` - второй раз, теперь пользователь авторизован):
   - Проверяет авторизацию (через JWT токен из cookie или header)
   - Создает **authorization code** через `oauthService.createAuthorizationCode()`
   - Очищает OAuth cookies
   - Редиректит на **redirect_uri сервиса** с code:
     ```typescript
     const redirectUrl = new URL(finalRedirectUri);
     redirectUrl.searchParams.set('code', code);
     redirectUrl.searchParams.set('state', finalState);
     return res.redirect(redirectUrl.toString());
     ```

7. **Сервис** получает code и обменивает его на access token через `/api/oauth/token`

---

## 2. Вход через GitHub

### Шаг 1: Инициализация OAuth flow
1. **Сервис** редиректит на `/api/oauth/authorize` (как в случае с паролем)
2. **Backend** редиректит на `index.html?oauth_flow=true&...`
3. Пользователь выбирает "Войти через GitHub"

### Шаг 2: GitHub OAuth flow
4. **Frontend** (`github-login.html`):
   - Вызывает `/api/auth/multi/oauth/github/url` с OAuth параметрами из sessionStorage
   - Получает GitHub OAuth URL
   - Редиректит на GitHub

5. **GitHub**:
   - Пользователь авторизуется
   - GitHub редиректит обратно на:
     ```
     https://loginus.startapus.com/api/auth/multi/oauth/github/callback?code=XXX&state=YYY
     ```

6. **Backend** (`multi-auth.controller.ts`, метод `handleGitHubCallback`):
   - **КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ**: Проверяет тип запроса:
     - Если это **браузерный запрос** (GET без `X-Requested-With: XMLHttpRequest` и без `Accept: application/json`) → редиректит на `github-login.html?code=XXX&state=YYY`
     - Если это **AJAX запрос** (от frontend) → обрабатывает callback и возвращает JSON
   
7. **Frontend** (`github-login.html`):
   - Обнаруживает `code` в URL
   - Делает AJAX запрос на `/api/auth/multi/oauth/github/callback?code=XXX&state=YYY` с заголовком `Accept: application/json`
   - Получает JSON ответ с токенами и OAuth флагами:
     ```json
     {
       "accessToken": "...",
       "refreshToken": "...",
       "user": {...},
       "oauthFlow": true,
       "returnTo": "/api/oauth/authorize",
       "clientId": "XXX",
       "redirectUri": "YYY"
     }
     ```

8. **Frontend** (`github-login.html`):
   - Сохраняет токены в localStorage
   - Если `oauthFlow === true` → редиректит на `/api/oauth/authorize` с параметрами:
     ```javascript
     window.location.href = `${apiBaseUrl}/api/oauth/authorize?client_id=XXX&redirect_uri=YYY&...`
     ```

### Шаг 3: Создание authorization code и редирект на сервис
9. **Backend** (`oauth.controller.ts`, метод `authorize`):
   - Пользователь уже авторизован (токены в localStorage, передаются через cookie)
   - Создает authorization code
   - Редиректит на **redirect_uri сервиса** с code

---

## 3. Вход через Telegram

### Шаг 1: Инициализация OAuth flow
1. **Сервис** редиректит на `/api/oauth/authorize` (как в случае с паролем)
2. **Backend** редиректит на `index.html?oauth_flow=true&...`
3. Пользователь выбирает "Войти через Telegram"

### Шаг 2: Telegram OAuth flow
4. **Frontend** (`telegram-login.html`):
   - Инициализирует Telegram Login Widget
   - Пользователь авторизуется через Telegram

5. **Telegram**:
   - После авторизации вызывает callback функцию с данными пользователя
   - Frontend отправляет POST запрос на `/api/auth/multi/oauth/telegram/callback`

6. **Backend** (`multi-auth.controller.ts`, метод `handleTelegramCallback`):
   - Обрабатывает данные Telegram
   - Создает/находит пользователя
   - Генерирует JWT токены
   - Проверяет OAuth flow (через referer или cookies)
   - Возвращает JSON с токенами и OAuth флагами:
     ```json
     {
       "accessToken": "...",
       "refreshToken": "...",
       "user": {...},
       "oauthFlow": true,
       "returnTo": "/api/oauth/authorize"
     }
     ```

7. **Frontend** (`telegram-login.html`):
   - Сохраняет токены в localStorage
   - Восстанавливает OAuth параметры из URL, cookies и sessionStorage (в порядке приоритета)
   - Если `oauthFlow === true` → редиректит на `/api/oauth/authorize` с параметрами:
     ```javascript
     window.location.href = `${apiBaseUrl}/api/oauth/authorize?client_id=XXX&redirect_uri=YYY&...`
     ```

### Шаг 3: Создание authorization code и редирект на сервис
8. **Backend** (`oauth.controller.ts`, метод `authorize`):
   - Пользователь уже авторизован
   - Создает authorization code
   - Редиректит на **redirect_uri сервиса** с code

---

## Ключевые отличия между методами авторизации

### Email/Пароль:
- ✅ Прямой flow: login → `/api/oauth/authorize` → редирект на сервис
- ✅ OAuth параметры сохраняются в cookies и sessionStorage
- ✅ Frontend сам редиректит на `/api/oauth/authorize` после успешного login

### GitHub:
- ⚠️ Двухэтапный flow: GitHub callback → frontend обработка → `/api/oauth/authorize` → редирект на сервис
- ⚠️ GitHub редиректит на backend endpoint, который должен определить тип запроса
- ⚠️ Backend редиректит браузерные запросы на `github-login.html` для frontend обработки
- ✅ OAuth параметры могут быть переданы через `state` параметр (base64 JSON)

### Telegram:
- ✅ Прямой flow: Telegram callback → frontend обработка → `/api/oauth/authorize` → редирект на сервис
- ✅ Telegram вызывает callback функцию на frontend, который делает AJAX запрос
- ✅ Backend всегда возвращает JSON (как и должно быть)
- ✅ OAuth параметры восстанавливаются из URL, cookies и sessionStorage

---

## Сохранение OAuth параметров

OAuth параметры (`client_id`, `redirect_uri`, `scope`, `state`) сохраняются в нескольких местах для надежности:

1. **Cookies** (backend устанавливает):
   - `oauth_flow_active=true`
   - `oauth_client_id=XXX`
   - `oauth_redirect_uri=YYY`
   - `oauth_scope=...`
   - `oauth_state_param=ZZZ`

2. **sessionStorage** (frontend сохраняет):
   - `oauth_flow=true`
   - `oauth_client_id=XXX`
   - `oauth_redirect_uri=YYY`
   - `oauth_scope=...`
   - `oauth_state_param=ZZZ`

3. **State параметр** (для GitHub, передается через OAuth flow):
   - Base64-encoded JSON с OAuth параметрами
   - Используется как резервный источник при кросс-доменных редиректах

**Приоритет восстановления параметров:**
1. Query параметры URL (самый высокий приоритет)
2. State параметр (для GitHub)
3. Cookies
4. sessionStorage (самый низкий приоритет)

---

## Финальный редирект на сервис

После успешной авторизации и создания authorization code, backend редиректит на `redirect_uri` сервиса:

```
https://vselena.ldmco.ru/api/auth/callback?code=AUTHORIZATION_CODE&state=ORIGINAL_STATE
```

**Сервис** должен:
1. Получить `code` из query параметров
2. Обменять его на access token через POST запрос на `/api/oauth/token`
3. Использовать access token для доступа к API Loginus

---

## Важные моменты

1. **GitHub callback endpoint** должен различать браузерные и AJAX запросы:
   - Браузерные запросы (от GitHub) → редирект на `github-login.html`
   - AJAX запросы (от frontend) → возврат JSON

2. **OAuth параметры** должны сохраняться на всех этапах flow, особенно при кросс-доменных редиректах

3. **State параметр** используется для передачи OAuth параметров через GitHub OAuth flow (когда cookies могут быть недоступны)

4. **Валидация redirect_uri** происходит на backend перед созданием authorization code

5. **Очистка cookies** происходит после успешного создания authorization code

