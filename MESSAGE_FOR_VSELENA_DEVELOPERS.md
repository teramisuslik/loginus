# Инструкция по интеграции OAuth для Vselena Service

## 📋 Информация о клиенте

- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Redirect URI**: `https://vselena.ldmco.ru/api/auth/callback`
- **Endpoint для обмена токена**: `https://loginus.startapus.com/api/oauth/token` (⚠️ НЕ `vselena.ldmco.ru`!)

## 🔐 Client Secret - Подтвержден ✅

**✅ Client Secret проверен и подтвержден!**

**Client Secret для использования:**
```
399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254
```

**Статус проверки:**
- ✅ Client Secret правильный для Client ID `ad829ce93adefd15b0804e88e150062c`
- ✅ Подходит для домена `vselena.ldmco.ru`
- ✅ Redirect URI `https://vselena.ldmco.ru/api/auth/callback` присутствует в списке разрешенных
- ✅ Обновлен в базе данных Loginus

**Дата проверки:** 10 ноября 2025

## 📚 Документация

1. **`OAUTH_TOKEN_EXCHANGE_GUIDE.md`** - Полная документация по обмену authorization code на access token
   - Примеры на JavaScript, Node.js, Python
   - Описание ошибок и их решений
   - Рекомендации по безопасности

2. **`OAUTH_QUICK_START.md`** - Краткая инструкция для быстрого старта

3. **`OAUTH_CLIENT_SECRET_VERIFICATION.md`** - Инструкция по проверке client_secret в базе данных

## 🔄 Быстрый старт

### Endpoint
```
POST https://loginus.startapus.com/api/oauth/token
Content-Type: application/x-www-form-urlencoded
```

### Параметры
```
grant_type=authorization_code
code={authorization_code_из_callback}
redirect_uri=https://vselena.ldmco.ru/api/auth/callback
client_id=ad829ce93adefd15b0804e88e150062c
client_secret={ПРОВЕРЬТЕ_ПРАВИЛЬНЫЙ_CLIENT_SECRET}
```

### Пример (JavaScript)
```javascript
const response = await fetch('https://loginus.startapus.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: codeFromCallback,
    redirect_uri: 'https://vselena.ldmco.ru/api/auth/callback',
    client_id: 'ad829ce93adefd15b0804e88e150062c',
    client_secret: '399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254' // ⚠️ ПРОВЕРЬТЕ!
  })
});

const tokens = await response.json();
// tokens.access_token - используйте для API запросов
```

## ⚠️ Важные моменты

1. **Используйте POST, а не GET** - иначе получите ошибку 405
2. **Content-Type должен быть `application/x-www-form-urlencoded`**
3. **redirect_uri должен точно совпадать** - включая протокол (https) и путь
4. **Client Secret храните в переменных окружения**, не в коде!

## 🆘 Решение проблем

### Ошибка 405 Method Not Allowed
- Используйте `method: 'POST'`, а не GET

### Ошибка 401 Unauthorized
- Проверьте правильность `client_id` и `client_secret`

### Ошибка 400 Redirect URI mismatch
- Убедитесь, что используете точно `https://vselena.ldmco.ru/api/auth/callback`

## 📞 Контакты

Если возникли вопросы, обратитесь к администратору Loginus для:
- Подтверждения правильности client_secret
- Проверки наличия redirect_uri в базе данных
- Создания нового OAuth клиента (если нужно)

---

**Дата создания:** 10 ноября 2025

