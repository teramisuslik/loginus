# Loginus OAuth Endpoints - Требования

## Endpoints, которые нужно добавить в Loginus

### 1. GET /oauth/authorize
**Назначение:** Инициация OAuth flow

**Параметры:**
- `client_id` - ID клиента (AI Aggregator)
- `redirect_uri` - URL для редиректа после авторизации
- `response_type=code` - Authorization Code flow
- `scope` - разрешения (openid email profile)
- `state` - CSRF защита

**Поведение:**
- Показать страницу авторизации Loginus
- После успешной авторизации - редирект на `redirect_uri?code=...&state=...`

---

### 2. POST /oauth/token
**Назначение:** Обмен authorization code на access token

**Параметры (form-urlencoded):**
- `grant_type=authorization_code`
- `code` - authorization code
- `redirect_uri` - тот же, что в authorize
- `client_id`
- `client_secret`

**Ответ:**
```json
{
  "access_token": "jwt_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "optional_refresh_token",
  "id_token": "optional_jwt_with_user_info"
}
```

---

### 3. GET /oauth/userinfo
**Назначение:** Получение информации о пользователе

**Headers:**
- `Authorization: Bearer {access_token}`

**Ответ:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+79991234567",
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 4. POST /oauth/logout (опционально)
**Назначение:** Выход из системы Loginus

**Параметры:**
- `token` - access_token или refresh_token
- `redirect_uri` - куда перенаправить после выхода

---

## Минимальная реализация для начала

Если полный OAuth слишком сложен, можно начать с упрощенной версии:

### Упрощенный вариант: GET /oauth/callback-with-token
**Назначение:** Прямой callback с токеном (для быстрого старта)

**Параметры в URL после авторизации:**
- `token` - JWT токен от Loginus
- `user_info` - JSON с информацией о пользователе (base64 encoded)
- `redirect_uri` - куда вернуть пользователя

**Пример:**
```
GET /oauth/callback-with-token?token=...&user_info=...&redirect_uri=http://localhost:80/auth/callback
```

**Поведение:**
- После авторизации в Loginus
- Генерировать JWT токен с информацией о пользователе
- Редиректить на `redirect_uri` с токеном и user_info

---

## Регистрация клиента

В Loginus должна быть возможность:
1. Зарегистрировать нового OAuth клиента
2. Получить `client_id` и `client_secret`
3. Указать разрешенные `redirect_uri`
4. Управлять разрешениями (`scope`)

---

## Безопасность

1. **Валидация redirect_uri** - проверять, что он зарегистрирован для клиента
2. **Валидация client_secret** - проверять при обмене code на token
3. **Срок действия code** - authorization code должен быть действителен короткое время (5-10 минут)
4. **HTTPS** - обязателен для production
5. **PKCE (опционально)** - для дополнительной безопасности мобильных приложений

