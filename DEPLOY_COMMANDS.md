# Команды для деплоя OAuth функционала

Выполните эти команды в терминале для деплоя:

## 1. Копирование файлов через scp

```bash
# Создаем директории
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "mkdir -p /root/loginus-backend/src/auth/entities /root/loginus-backend/src/auth/services /root/loginus-backend/src/auth/controllers /root/loginus-backend/src/auth/dto /root/loginus-backend/src/database/migrations"

# Копируем новые файлы
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\entities\oauth-client.entity.ts root@45.144.176.42:/root/loginus-backend/src/auth/entities/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\entities\authorization-code.entity.ts root@45.144.176.42:/root/loginus-backend/src/auth/entities/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\services\oauth.service.ts root@45.144.176.42:/root/loginus-backend/src/auth/services/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\controllers\oauth.controller.ts root@45.144.176.42:/root/loginus-backend/src/auth/controllers/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\dto\oauth-token.dto.ts root@45.144.176.42:/root/loginus-backend/src/auth/dto/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\database\migrations\1761343000000-CreateOAuthTables.ts root@45.144.176.42:/root/loginus-backend/src/database/migrations/

# Копируем обновленные файлы
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\package.json root@45.144.176.42:/root/loginus-backend/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\main.ts root@45.144.176.42:/root/loginus-backend/src/
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\auth.module.ts root@45.144.176.42:/root/loginus-backend/src/auth/
```

## 2. Подключение к серверу и выполнение команд

```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
```

## 3. На сервере выполнить:

```bash
cd /root/loginus-backend

# Установить зависимости
npm install cookie-parser @types/cookie-parser

# Запустить миграции
npm run migration:run

# Собрать проект
npm run build

# Перезапустить приложение (выберите нужный вариант)
# Если используется PM2:
pm2 restart loginus-backend

# Если используется systemd:
systemctl restart loginus-backend

# Если используется Docker:
docker-compose restart backend
```

## Альтернатива: использовать Python скрипт

Если у вас установлен Python 3, можно выполнить:

```bash
python deploy_oauth.py
```

