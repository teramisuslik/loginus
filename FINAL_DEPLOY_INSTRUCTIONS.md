# 🚀 Инструкция по деплою OAuth функционала

## Шаг 1: Подключение к серверу

Откройте терминал (Git Bash, PowerShell или CMD) и выполните:

```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
```

## Шаг 2: Копирование файлов

В **НОВОМ терминале** (не на сервере, а локально) выполните команды для копирования файлов:

### Windows PowerShell:
```powershell
$sshKey = "C:\Users\teramisuslik\.ssh\id_ed25519"
$server = "root@45.144.176.42"

# Создаем директории
ssh -i $sshKey $server "mkdir -p /root/loginus-backend/src/auth/entities /root/loginus-backend/src/auth/services /root/loginus-backend/src/auth/controllers /root/loginus-backend/src/auth/dto /root/loginus-backend/src/database/migrations"

# Копируем файлы
scp -i $sshKey loginus-backend\src\auth\entities\oauth-client.entity.ts ${server}:/root/loginus-backend/src/auth/entities/
scp -i $sshKey loginus-backend\src\auth\entities\authorization-code.entity.ts ${server}:/root/loginus-backend/src/auth/entities/
scp -i $sshKey loginus-backend\src\auth\services\oauth.service.ts ${server}:/root/loginus-backend/src/auth/services/
scp -i $sshKey loginus-backend\src\auth\controllers\oauth.controller.ts ${server}:/root/loginus-backend/src/auth/controllers/
scp -i $sshKey loginus-backend\src\auth\dto\oauth-token.dto.ts ${server}:/root/loginus-backend/src/auth/dto/
scp -i $sshKey loginus-backend\src\database\migrations\1761343000000-CreateOAuthTables.ts ${server}:/root/loginus-backend/src/database/migrations/
scp -i $sshKey loginus-backend\package.json ${server}:/root/loginus-backend/
scp -i $sshKey loginus-backend\src\main.ts ${server}:/root/loginus-backend/src/
scp -i $sshKey loginus-backend\src\auth\auth.module.ts ${server}:/root/loginus-backend/src/auth/
```

### Git Bash / Linux:
```bash
SSH_KEY="C:\Users\teramisuslik\.ssh\id_ed25519"
SERVER="root@45.144.176.42"

# Создаем директории
ssh -i "$SSH_KEY" "$SERVER" "mkdir -p /root/loginus-backend/src/auth/entities /root/loginus-backend/src/auth/services /root/loginus-backend/src/auth/controllers /root/loginus-backend/src/auth/dto /root/loginus-backend/src/database/migrations"

# Копируем файлы
scp -i "$SSH_KEY" loginus-backend/src/auth/entities/oauth-client.entity.ts ${SERVER}:/root/loginus-backend/src/auth/entities/
scp -i "$SSH_KEY" loginus-backend/src/auth/entities/authorization-code.entity.ts ${SERVER}:/root/loginus-backend/src/auth/entities/
scp -i "$SSH_KEY" loginus-backend/src/auth/services/oauth.service.ts ${SERVER}:/root/loginus-backend/src/auth/services/
scp -i "$SSH_KEY" loginus-backend/src/auth/controllers/oauth.controller.ts ${SERVER}:/root/loginus-backend/src/auth/controllers/
scp -i "$SSH_KEY" loginus-backend/src/auth/dto/oauth-token.dto.ts ${SERVER}:/root/loginus-backend/src/auth/dto/
scp -i "$SSH_KEY" loginus-backend/src/database/migrations/1761343000000-CreateOAuthTables.ts ${SERVER}:/root/loginus-backend/src/database/migrations/
scp -i "$SSH_KEY" loginus-backend/package.json ${SERVER}:/root/loginus-backend/
scp -i "$SSH_KEY" loginus-backend/src/main.ts ${SERVER}:/root/loginus-backend/src/
scp -i "$SSH_KEY" loginus-backend/src/auth/auth.module.ts ${SERVER}:/root/loginus-backend/src/auth/
```

## Шаг 3: На сервере выполнить команды

В SSH сессии на сервере выполните:

```bash
cd /root/loginus-backend

# 1. Установить зависимости
npm install cookie-parser @types/cookie-parser

# 2. Запустить миграции
npm run migration:run

# 3. Собрать проект
npm run build

# 4. Перезапустить приложение (выберите нужный вариант):

# Если используется PM2:
pm2 restart loginus-backend

# Или если используется systemd:
systemctl restart loginus-backend

# Или если используется Docker:
docker-compose restart backend
```

## Шаг 4: Проверка

1. Откройте Swagger документацию: http://45.144.176.42:3001/api/docs
2. Найдите секцию "oauth" - там должны быть новые endpoints:
   - GET /api/oauth/authorize
   - POST /api/oauth/token
   - GET /api/oauth/userinfo
   - POST /api/oauth/logout

## Готово! ✅

OAuth функционал успешно задеплоен и готов к использованию.

## Примечания

- Все существующие endpoints остаются без изменений
- OAuth endpoints доступны по пути `/api/oauth/*`
- Для использования OAuth нужно сначала зарегистрировать клиента (см. DEPLOY_OAUTH.md)

