# Инструкция по деплою OAuth функционала

## Что было добавлено

1. **OAuth Entities:**
   - `OAuthClient` - для хранения OAuth клиентов
   - `AuthorizationCode` - для хранения authorization codes

2. **OAuth Service** (`oauth.service.ts`):
   - Валидация клиентов
   - Создание authorization codes
   - Обмен code на access token
   - Получение информации о пользователе

3. **OAuth Controller** (`oauth.controller.ts`):
   - `GET /api/oauth/authorize` - инициация OAuth flow
   - `POST /api/oauth/token` - обмен code на token
   - `GET /api/oauth/userinfo` - получение информации о пользователе
   - `POST /api/oauth/logout` - выход из системы

4. **Миграция** - `1761343000000-CreateOAuthTables.ts`

5. **Зависимости:**
   - `cookie-parser` - для работы с cookies

## Шаги деплоя

### 1. Подключение к серверу
```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
```

### 2. Переход в директорию проекта
```bash
cd /root/loginus-backend  # или путь к проекту на сервере
```

### 3. Обновление кода
```bash
# Если используется git
git pull origin master

# Или скопировать файлы через scp
# scp -i C:\Users\teramisuslik\.ssh\id_ed25519 -r loginus-backend/src/auth/entities/* root@45.144.176.42:/root/loginus-backend/src/auth/entities/
# scp -i C:\Users\teramisuslik\.ssh\id_ed25519 -r loginus-backend/src/auth/services/oauth.service.ts root@45.144.176.42:/root/loginus-backend/src/auth/services/
# scp -i C:\Users\teramisuslik\.ssh\id_ed25519 -r loginus-backend/src/auth/controllers/oauth.controller.ts root@45.144.176.42:/root/loginus-backend/src/auth/controllers/
# scp -i C:\Users\teramisuslik\.ssh\id_ed25519 -r loginus-backend/src/auth/dto/oauth-token.dto.ts root@45.144.176.42:/root/loginus-backend/src/auth/dto/
# scp -i C:\Users\teramisuslik\.ssh\id_ed25519 -r loginus-backend/src/database/migrations/1761343000000-CreateOAuthTables.ts root@45.144.176.42:/root/loginus-backend/src/database/migrations/
```

### 4. Установка зависимостей
```bash
npm install cookie-parser @types/cookie-parser
```

### 5. Запуск миграций
```bash
npm run migration:run
```

### 6. Сборка проекта
```bash
npm run build
```

### 7. Перезапуск приложения
```bash
# Если используется PM2
pm2 restart loginus-backend

# Или если используется systemd
systemctl restart loginus-backend

# Или если используется Docker
docker-compose restart backend
```

## Проверка работы

### 1. Проверка endpoints
```bash
# Проверка Swagger документации
curl http://localhost:3001/api/docs

# Проверка OAuth endpoints в Swagger
# Откройте http://45.144.176.42:3001/api/docs
```

### 2. Регистрация OAuth клиента
Для регистрации OAuth клиента можно использовать метод `registerClient` в `OAuthService` или создать клиента напрямую в БД:

```sql
INSERT INTO oauth_clients (id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'your-client-id',
  'your-client-secret',
  'AI Aggregator',
  ARRAY['http://localhost:80/auth/callback'],
  ARRAY['openid', 'email', 'profile'],
  true,
  NOW(),
  NOW()
);
```

### 3. Тестирование OAuth flow

1. **Инициация OAuth:**
```bash
curl "http://localhost:3001/api/oauth/authorize?client_id=your-client-id&redirect_uri=http://localhost:80/auth/callback&response_type=code&scope=openid%20email%20profile&state=test-state"
```

2. **Обмен code на token:**
```bash
curl -X POST "http://localhost:3001/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=http://localhost:80/auth/callback&client_id=your-client-id&client_secret=your-client-secret"
```

3. **Получение userinfo:**
```bash
curl -X GET "http://localhost:3001/api/oauth/userinfo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Важные замечания

1. **Безопасность:**
   - `client_secret` должен храниться безопасно
   - Используйте HTTPS в production
   - Валидация `redirect_uri` обязательна

2. **Авторизация пользователя:**
   - Endpoint `/oauth/authorize` требует, чтобы пользователь был авторизован
   - Если пользователь не авторизован, необходимо сначала выполнить login через `/api/auth/login`
   - После успешного логина можно повторить запрос к `/oauth/authorize`

3. **Срок действия authorization code:**
   - Authorization code действителен 10 минут
   - После использования помечается как `isUsed = true`

## Откат изменений (если нужно)

```bash
# Откат миграции
npm run migration:revert

# Удаление зависимостей (опционально)
npm uninstall cookie-parser @types/cookie-parser
```

