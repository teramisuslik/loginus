# OAuth Integration - Quick Start Guide

## 🚀 Быстрый старт

### 1. Endpoint для обмена токена

**URL:** `https://loginus.startapus.com/api/oauth/token`  
**Метод:** `POST`  
**Content-Type:** `application/x-www-form-urlencoded`

⚠️ **ВАЖНО:** Используйте `https://loginus.startapus.com/api/oauth/token`, а НЕ `https://vselena.ldmco.ru/api/oauth/token`!

### 2. Параметры запроса

```
grant_type=authorization_code
code={authorization_code_из_callback}
redirect_uri=https://vselena.ldmco.ru/api/auth/callback
client_id=ad829ce93adefd15b0804e88e150062c
client_secret={YOUR_CLIENT_SECRET}
```

### 3. Минимальный пример (cURL)

```bash
curl -X POST https://loginus.startapus.com/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE" \
  -d "redirect_uri=https://vselena.ldmco.ru/api/auth/callback" \
  -d "client_id=ad829ce93adefd15b0804e88e150062c" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

### 4. Минимальный пример (JavaScript)

```javascript
const response = await fetch('https://loginus.startapus.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: codeFromCallback,
    redirect_uri: 'https://vselena.ldmco.ru/api/auth/callback',
    client_id: 'ad829ce93adefd15b0804e88e150062c',
    client_secret: process.env.LOGINUS_CLIENT_SECRET
  })
});

const tokens = await response.json();
// tokens.access_token - используйте для API запросов
```

### 5. Ответ

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "..."
}
```

## ❌ Частые ошибки

### 405 Method Not Allowed
**Причина:** Используете GET вместо POST  
**Решение:** Используйте `method: 'POST'`

### 400 Redirect URI mismatch
**Причина:** `redirect_uri` не совпадает  
**Решение:** Используйте точно `https://vselena.ldmco.ru/api/auth/callback`

### 400 Invalid or expired authorization code
**Причина:** Код уже использован или истек (10 минут)  
**Решение:** Запросите новый authorization code

## 📚 Полная документация

См. `OAUTH_TOKEN_EXCHANGE_GUIDE.md` для подробных примеров на разных языках.

