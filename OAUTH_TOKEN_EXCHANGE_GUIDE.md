# Инструкция по обмену Authorization Code на Access Token

## 📋 Обзор

После успешной авторизации пользователя через Loginus, ваш сервис получает `authorization code` в параметре `code` URL callback'а. Этот код необходимо обменять на `access_token` для дальнейшей работы с API Loginus.

## 🔗 Endpoint для обмена токена

**URL:** `https://loginus.startapus.com/api/oauth/token`

**Метод:** `POST`

**Content-Type:** `application/x-www-form-urlencoded`

⚠️ **ВАЖНО:** Endpoint находится по адресу `https://loginus.startapus.com/api/oauth/token`, а НЕ `https://vselena.ldmco.ru/api/oauth/token`!

## 📝 Параметры запроса

Все параметры должны быть переданы в теле запроса в формате `application/x-www-form-urlencoded`:

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `grant_type` | string | ✅ Да | Должно быть `authorization_code` |
| `code` | string | ✅ Да | Authorization code из callback URL (параметр `code`) |
| `redirect_uri` | string | ✅ Да | Тот же redirect_uri, что использовался в `/oauth/authorize` (должен точно совпадать) |
| `client_id` | string | ✅ Да | Ваш Client ID: `ad829ce93adefd15b0804e88e150062c` |
| `client_secret` | string | ✅ Да | Ваш Client Secret (проверьте в `OAUTH_CLIENT_SECRET_VERIFICATION.md` или получите у администратора Loginus) |

## 📨 Пример запроса

### cURL

```bash
curl -X POST https://loginus.startapus.com/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=7fb3193e465ed2869c518241789377a6a213fb078f2868920d42ffadd74c7fc6" \
  -d "redirect_uri=https://vselena.ldmco.ru/api/auth/callback" \
  -d "client_id=ad829ce93adefd15b0804e88e150062c" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

### JavaScript (Fetch API)

```javascript
async function exchangeCodeForToken(code, state) {
  const response = await fetch('https://loginus.startapus.com/api/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://vselena.ldmco.ru/api/auth/callback',
      client_id: 'ad829ce93adefd15b0804e88e150062c',
      client_secret: 'YOUR_CLIENT_SECRET' // ⚠️ Храните в переменных окружения!
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.message}`);
  }

  return await response.json();
}

// Использование в callback handler
app.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  try {
    const tokens = await exchangeCodeForToken(code, state);
    // tokens содержит: access_token, token_type, expires_in, refresh_token, id_token
    
    // Сохраните токены в сессии или cookies
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    
    // Перенаправьте пользователя на главную страницу
    res.redirect('/');
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    res.status(500).send('Authentication failed');
  }
});
```

### Node.js (Express)

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  try {
    const response = await axios.post(
      'https://loginus.startapus.com/api/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://vselena.ldmco.ru/api/auth/callback',
        client_id: 'ad829ce93adefd15b0804e88e150062c',
        client_secret: process.env.LOGINUS_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, token_type, expires_in, refresh_token, id_token } = response.data;
    
    // Сохраните токены
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    
    res.redirect('/');
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});
```

### Python (Flask)

```python
import requests
from flask import Flask, request, redirect, session
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')

@app.route('/api/auth/callback')
def oauth_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Обмен code на token
    token_url = 'https://loginus.startapus.com/api/oauth/token'
    token_data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': 'https://vselena.ldmco.ru/api/auth/callback',
        'client_id': 'ad829ce93adefd15b0804e88e150062c',
        'client_secret': os.environ.get('LOGINUS_CLIENT_SECRET')
    }
    
    response = requests.post(
        token_url,
        data=token_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    if response.status_code == 200:
        tokens = response.json()
        session['access_token'] = tokens['access_token']
        session['refresh_token'] = tokens.get('refresh_token')
        return redirect('/')
    else:
        return f"Error: {response.json()}", 500
```

### Python (Django)

```python
import requests
from django.shortcuts import redirect
from django.conf import settings
import os

def oauth_callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    
    token_url = 'https://loginus.startapus.com/api/oauth/token'
    token_data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': 'https://vselena.ldmco.ru/api/auth/callback',
        'client_id': 'ad829ce93adefd15b0804e88e150062c',
        'client_secret': os.environ.get('LOGINUS_CLIENT_SECRET')
    }
    
    response = requests.post(
        token_url,
        data=token_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    if response.status_code == 200:
        tokens = response.json()
        request.session['access_token'] = tokens['access_token']
        request.session['refresh_token'] = tokens.get('refresh_token')
        return redirect('/')
    else:
        return HttpResponse(f"Error: {response.json()}", status=500)
```

## ✅ Успешный ответ

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmODMwNDc4OC0yNGE0LTRhYzk...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmODMwNDc4OC0yNGE0LTRhYzk..."
}
```

### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `access_token` | string | JWT токен для доступа к API (действителен 1 час) |
| `token_type` | string | Тип токена (всегда `Bearer`) |
| `expires_in` | number | Время жизни токена в секундах (3600 = 1 час) |
| `refresh_token` | string | Токен для обновления access_token (опционально) |
| `id_token` | string | JWT с информацией о пользователе (OpenID Connect) |

## ❌ Ошибки

### 400 Bad Request - Неверные параметры

```json
{
  "statusCode": 400,
  "message": "Missing required parameters",
  "error": "Bad Request"
}
```

**Причины:**
- Отсутствует обязательный параметр (`grant_type`, `code`, `redirect_uri`, `client_id`, `client_secret`)
- `grant_type` не равен `authorization_code`

### 400 Bad Request - Неверный код

```json
{
  "statusCode": 400,
  "message": "Invalid or expired authorization code",
  "error": "Bad Request"
}
```

**Причины:**
- Authorization code уже использован
- Authorization code истек (срок действия: 10 минут)
- Authorization code не существует

### 400 Bad Request - Несовпадение redirect_uri

```json
{
  "statusCode": 400,
  "message": "Redirect URI mismatch",
  "error": "Bad Request"
}
```

**Причина:**
- `redirect_uri` в запросе не совпадает с тем, что использовался при получении authorization code

⚠️ **ВАЖНО:** `redirect_uri` должен точно совпадать, включая протокол (https), домен и путь!

## 🔐 Безопасность

1. **Никогда не храните `client_secret` в коде!** Используйте переменные окружения:
   ```bash
   # .env
   LOGINUS_CLIENT_SECRET=your_secret_here
   ```

2. **Храните токены безопасно:**
   - Access token: в памяти или зашифрованных cookies (httpOnly, secure)
   - Refresh token: в защищенной базе данных

3. **Используйте HTTPS** для всех запросов

4. **Валидируйте `state` параметр** для защиты от CSRF атак

## 🔄 Полный OAuth Flow

1. **Пользователь нажимает "Войти"** на вашем сайте
2. **Редирект на Loginus:**
   ```
   https://loginus.startapus.com/oauth/authorize?
     client_id=ad829ce93adefd15b0804e88e150062c&
     redirect_uri=https://vselena.ldmco.ru/api/auth/callback&
     response_type=code&
     scope=openid+email+profile+organizations+roles+permissions&
     state=random_state_string
   ```
3. **Пользователь авторизуется** на Loginus
4. **Редирект обратно на ваш callback:**
   ```
   https://vselena.ldmco.ru/api/auth/callback?
     code=7fb3193e465ed2869c518241789377a6a213fb078f2868920d42ffadd74c7fc6&
     state=random_state_string
   ```
5. **Обмен code на token** (этот документ)
6. **Использование access_token** для запросов к API

## 📞 Получение информации о пользователе

После получения `access_token`, вы можете получить информацию о пользователе:

```http
GET https://loginus.startapus.com/api/oauth/userinfo
Authorization: Bearer {access_token}
```

**Ответ:**
```json
{
  "sub": "f8304788-24a4-4ac9-ad1d-b5d8f92ab48e",
  "email": "user@example.com",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "phone": "+79991234567",
  "phone_verified": true,
  "roles": ["user"],
  "organizations": [...],
  "permissions": [...]
}
```

## 🆘 Решение проблем

### Ошибка 405 Method Not Allowed

**Проблема:** Вы используете GET вместо POST

**Решение:** Убедитесь, что используете метод `POST`:

```javascript
// ❌ НЕПРАВИЛЬНО
fetch('https://loginus.startapus.com/api/oauth/token?code=...')

// ✅ ПРАВИЛЬНО
fetch('https://loginus.startapus.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ ... })
})
```

### Ошибка 401 Unauthorized

**Проблема:** Неверный `client_id` или `client_secret`

**Решение:** Проверьте правильность учетных данных

### Ошибка 400 Redirect URI mismatch

**Проблема:** `redirect_uri` не совпадает

**Решение:** Убедитесь, что используете точно такой же `redirect_uri`, как при запросе authorization code:
- ✅ `https://vselena.ldmco.ru/api/auth/callback`
- ❌ `http://vselena.ldmco.ru/api/auth/callback` (http вместо https)
- ❌ `https://vselena.ldmco.ru/auth/callback` (другой путь)

## 📚 Дополнительные ресурсы

- **Swagger документация:** https://loginus.startapus.com/api/docs
- **Base URL API:** https://loginus.startapus.com/api
- **OAuth Authorize:** https://loginus.startapus.com/oauth/authorize
- **OAuth Token:** https://loginus.startapus.com/api/oauth/token
- **OAuth UserInfo:** https://loginus.startapus.com/api/oauth/userinfo

## 🔐 Client Secret - Подтвержден ✅

**✅ Client Secret проверен и обновлен в базе данных!**

**Client Secret для использования:**
```
399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254
```

**Статус:**
- ✅ Client Secret правильный и активен
- ✅ Подходит для Client ID `ad829ce93adefd15b0804e88e150062c`
- ✅ Работает с redirect_uri `https://vselena.ldmco.ru/api/auth/callback`
- ✅ Обновлен в базе данных Loginus

**Дата проверки:** 10 ноября 2025

## 📧 Контакты

Если у вас возникли проблемы с интеграцией, обратитесь к администратору Loginus.

---

**Дата создания:** 10 ноября 2025  
**Версия:** 1.1  
**Последнее обновление:** Добавлена информация о проверке Client Secret

