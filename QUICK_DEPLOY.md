# Быстрый деплой - выполните эти команды

## Вариант 1: Через Git Bash или PowerShell

Скопируйте и выполните команды по очереди:

```bash
# 1. Скопировать скрипт на сервер
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 deploy_all.sh root@45.144.176.42:/root/

# 2. Выполнить скрипт на сервере
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "bash /root/deploy_all.sh"
```

## Вариант 2: Ручное копирование файлов

Если скрипт не работает, скопируйте файлы по одному:

```bash
# Создать директории
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "mkdir -p /root/loginus-backend/src/auth/{entities,services,controllers,dto} /root/loginus-backend/src/database/migrations"

# Скопировать файлы
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\entities\oauth-client.entity.ts root@45.144.176.42:/root/loginus-backend/src/auth/entities/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\entities\authorization-code.entity.ts root@45.144.176.42:/root/loginus-backend/src/auth/entities/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\services\oauth.service.ts root@45.144.176.42:/root/loginus-backend/src/auth/services/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\controllers\oauth.controller.ts root@45.144.176.42:/root/loginus-backend/src/auth/controllers/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\dto\oauth-token.dto.ts root@45.144.176.42:/root/loginus-backend/src/auth/dto/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\database\migrations\1761343000000-CreateOAuthTables.ts root@45.144.176.42:/root/loginus-backend/src/database/migrations/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\package.json root@45.144.176.42:/root/loginus-backend/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\main.ts root@45.144.176.42:/root/loginus-backend/src/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\auth.module.ts root@45.144.176.42:/root/loginus-backend/src/auth/

# На сервере выполнить:
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
# Затем:
cd /root/loginus-backend
npm install cookie-parser @types/cookie-parser
npm run migration:run
npm run build
pm2 restart loginus-backend
```

## Проверка

После деплоя проверьте: http://45.144.176.42:3001/api/docs

Должны появиться новые endpoints в секции "oauth".

