# Недостающие Endpoints для Loginus

Для полной поддержки регистрации и авторизации через Loginus (включая GitHub и Telegram) нужны следующие endpoints:

---

## 1. GET /oauth/register (или параметр в /oauth/authorize)

**Назначение:** Редирект на страницу регистрации Loginus с сохранением OAuth параметров

**Проблема:** 
Сейчас `/oauth/authorize` требует, чтобы пользователь был уже авторизован. Если пользователь не зарегистрирован, он должен сначала зарегистрироваться в Loginus, а потом уже использовать OAuth.

**Решение:**
Создать отдельный endpoint или параметр `mode=register` в `/oauth/authorize`, который:
1. Сохраняет OAuth параметры (client_id, redirect_uri, state, scope) в cookies или session
2. Редиректит на страницу регистрации Loginus (например: `https://vselena.ldmco.ru/index.html?mode=register&oauth_flow=true`)
3. После успешной регистрации в Loginus автоматически продолжает OAuth flow

**Параметры запроса:**
- `client_id` - ID клиента
- `redirect_uri` - URL для редиректа после авторизации
- `response_type=code` - Тип ответа
- `scope` - Запрашиваемые разрешения
- `state` - CSRF защита
- `mode=register` (опционально) - Режим регистрации

**Поведение:**
1. Сохранить OAuth параметры в cookies/session
2. Редирект на `https://vselena.ldmco.ru/index.html?mode=register&oauth_flow=true&return_to=/oauth/authorize`
3. После регистрации Loginus редиректит на `/oauth/authorize` с сохраненными параметрами
4. Продолжается обычный OAuth flow

---

## 2. GET /oauth/authorize (обновленный)

**Текущее поведение:** Возвращает 401, если пользователь не авторизован

**Желаемое поведение:**
1. **Если пользователь НЕ авторизован:**
   - Сохранить OAuth параметры в cookies
   - Редирект на страницу авторизации/регистрации Loginus с параметром `oauth_flow=true`
   - URL: `https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/oauth/authorize`

2. **Если пользователь авторизован:**
   - Продолжить обычный OAuth flow (как сейчас)

**Параметры для страницы авторизации:**
- `oauth_flow=true` - флаг, что это OAuth flow
- `return_to=/oauth/authorize` - куда вернуться после авторизации
- `client_id` - для отображения информации о клиенте (опционально)

---

## 3. GET /oauth/authorize/status (опционально)

**Назначение:** Проверка статуса авторизации пользователя перед OAuth flow

**Параметры:**
- `client_id` - ID клиента

**Ответ:**
```json
{
  "authenticated": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

Или если не авторизован:
```json
{
  "authenticated": false,
  "redirect_url": "https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/oauth/authorize"
}
```

---

## 4. Поддержка GitHub и Telegram OAuth

**Текущая ситуация:**
GitHub и Telegram OAuth работают прямо на странице Loginus, но после успешной авторизации нужно убедиться, что пользователь автоматически перенаправляется на `/oauth/authorize` для продолжения OAuth flow.

**Требования:**
1. После успешной авторизации через GitHub/Telegram в Loginus
2. Пользователь должен быть автоматически перенаправлен на `/oauth/authorize` с сохраненными OAuth параметрами
3. OAuth flow продолжается как обычно

**Возможное решение:**
- При клике на "GitHub" или "Telegram" на странице Loginus (когда `oauth_flow=true`)
- Loginus сохраняет OAuth параметры
- После успешной авторизации через GitHub/Telegram
- Loginus редиректит на `/oauth/authorize` с сохраненными параметрами
- OAuth flow продолжается

---

## 5. POST /oauth/authorize/prepare (опционально)

**Назначение:** Подготовка OAuth flow с сохранением параметров

**Параметры (JSON или Query):**
- `client_id`
- `redirect_uri`
- `scope`
- `state`
- `mode` - `login` или `register` (опционально)

**Ответ:**
```json
{
  "session_id": "session_id_for_oauth",
  "redirect_url": "https://vselena.ldmco.ru/index.html?oauth_flow=true&session_id=...&mode=register"
}
```

**Поведение:**
1. Сохранить OAuth параметры в session по `session_id`
2. Вернуть URL для редиректа на страницу Loginus
3. После авторизации/регистрации Loginus использует `session_id` для восстановления параметров
4. Редирект на `/oauth/authorize` с восстановленными параметрами

---

## Рекомендуемый подход

### Вариант 1: Простой (рекомендуется)

**Изменить поведение `/oauth/authorize`:**

1. Если пользователь НЕ авторизован:
   - Сохранить OAuth параметры в cookies (сейчас уже делается)
   - Редирект на `https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/oauth/authorize`
   - После авторизации/регистрации Loginus проверяет наличие `return_to` и OAuth параметров в cookies
   - Если есть - редирект на `/oauth/authorize` для продолжения OAuth flow

2. Если пользователь авторизован:
   - Продолжить обычный OAuth flow

**Что нужно добавить в Loginus:**
- Проверка наличия `oauth_flow=true` и `return_to` параметров
- После успешной авторизации/регистрации через Email/GitHub/Telegram
- Проверка наличия OAuth параметров в cookies (которые были сохранены при 401)
- Редирект на `/oauth/authorize` для продолжения OAuth flow

---

### Вариант 2: С отдельным endpoint для регистрации

**Добавить `GET /oauth/register`:**

1. Сохранить OAuth параметры в cookies
2. Редирект на `https://vselena.ldmco.ru/index.html?mode=register&oauth_flow=true`
3. После регистрации Loginus редиректит на `/oauth/authorize`
4. OAuth flow продолжается

**Преимущества:**
- Четкое разделение между входом и регистрацией
- Более понятный flow

---

## Итоговый список недостающих endpoints

### Обязательные:

1. **Обновить `/oauth/authorize`:**
   - При 401 (неавторизован) редиректить на страницу авторизации/регистрации Loginus
   - После успешной авторизации/регистрации автоматически продолжать OAuth flow

### Опциональные (для улучшения UX):

2. **`GET /oauth/register`** - отдельный endpoint для регистрации
3. **`GET /oauth/authorize/status`** - проверка статуса авторизации
4. **`POST /oauth/authorize/prepare`** - подготовка OAuth flow с session

---

## Что нужно сделать в Loginus

1. **Обработка параметра `oauth_flow=true`:**
   - На странице авторизации/регистрации (`/index.html`)
   - Если присутствует `oauth_flow=true` и `return_to=/oauth/authorize`
   - После успешной авторизации/регистрации (Email/GitHub/Telegram)
   - Проверить наличие OAuth параметров в cookies (которые были сохранены при 401)
   - Редирект на `/oauth/authorize` для продолжения OAuth flow

2. **Поддержка GitHub и Telegram:**
   - После успешной авторизации через GitHub/Telegram
   - Проверить наличие `oauth_flow=true` и OAuth параметров
   - Редирект на `/oauth/authorize` для продолжения OAuth flow

3. **Сохранение OAuth параметров:**
   - При возврате 401 в `/oauth/authorize` параметры сохраняются в cookies
   - Эти cookies должны быть доступны после авторизации/регистрации
   - Использовать для восстановления OAuth flow

---

## Пример flow с регистрацией

```
1. Пользователь нажимает "Вход/Регистрация" в AI Aggregator
   ↓
2. GET /v1/auth/loginus
   ↓
3. GET /oauth/authorize?client_id=...&redirect_uri=...&state=...
   ↓
4. Пользователь НЕ авторизован → 401
   ↓
5. OAuth параметры сохраняются в cookies
   ↓
6. Редирект на https://vselena.ldmco.ru/index.html?oauth_flow=true&return_to=/oauth/authorize
   ↓
7. Пользователь выбирает способ регистрации (Email/GitHub/Telegram)
   ↓
8. Регистрация/авторизация в Loginus
   ↓
9. Loginus проверяет наличие oauth_flow=true и OAuth параметров в cookies
   ↓
10. Редирект на /oauth/authorize (с восстановленными параметрами из cookies)
    ↓
11. Пользователь авторизован → OAuth flow продолжается
    ↓
12. GET /oauth/authorize возвращает code
    ↓
13. Редирект на /v1/auth/callback?code=...&state=...
    ↓
14. Обмен code на access_token
    ↓
15. Получение userinfo
    ↓
16. Синхронизация пользователя в AI Aggregator
    ↓
17. Редирект на frontend с JWT токеном
```

---

## Итого

**Минимально необходимые изменения в Loginus:**

1. Обновить `/oauth/authorize` для редиректа на страницу авторизации при 401
2. Добавить обработку `oauth_flow=true` на странице авторизации/регистрации
3. После успешной авторизации/регистрации (Email/GitHub/Telegram) проверять наличие OAuth параметров и редиректить на `/oauth/authorize`

**Это обеспечит:**
- ✅ Регистрацию через Loginus
- ✅ Авторизацию через Email
- ✅ Авторизацию через GitHub
- ✅ Авторизацию через Telegram
- ✅ Автоматическое продолжение OAuth flow после любого способа авторизации

