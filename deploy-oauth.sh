#!/bin/bash

# Скрипт для деплоя OAuth функционала на сервер

SERVER="root@45.144.176.42"
SSH_KEY="C:\\Users\\teramisuslik\\.ssh\\id_ed25519"
PROJECT_DIR="/root/loginus-backend"

echo "🚀 Начинаем деплой OAuth функционала..."

# Функция для копирования файла через SSH
copy_file() {
    local local_file=$1
    local remote_file=$2
    echo "📋 Копирую $local_file -> $remote_file"
    
    # Создаем директорию на сервере, если её нет
    ssh -i "$SSH_KEY" "$SERVER" "mkdir -p $(dirname $remote_file)"
    
    # Копируем файл
    scp -i "$SSH_KEY" "$local_file" "$SERVER:$remote_file"
}

# Копируем новые entities
copy_file "loginus-backend/src/auth/entities/oauth-client.entity.ts" "$PROJECT_DIR/src/auth/entities/oauth-client.entity.ts"
copy_file "loginus-backend/src/auth/entities/authorization-code.entity.ts" "$PROJECT_DIR/src/auth/entities/authorization-code.entity.ts"

# Копируем новый сервис
copy_file "loginus-backend/src/auth/services/oauth.service.ts" "$PROJECT_DIR/src/auth/services/oauth.service.ts"

# Копируем новый контроллер
copy_file "loginus-backend/src/auth/controllers/oauth.controller.ts" "$PROJECT_DIR/src/auth/controllers/oauth.controller.ts"

# Копируем новый DTO
copy_file "loginus-backend/src/auth/dto/oauth-token.dto.ts" "$PROJECT_DIR/src/auth/dto/oauth-token.dto.ts"

# Копируем миграцию
copy_file "loginus-backend/src/database/migrations/1761343000000-CreateOAuthTables.ts" "$PROJECT_DIR/src/database/migrations/1761343000000-CreateOAuthTables.ts"

# Копируем обновленные файлы
copy_file "loginus-backend/package.json" "$PROJECT_DIR/package.json"
copy_file "loginus-backend/src/main.ts" "$PROJECT_DIR/src/main.ts"
copy_file "loginus-backend/src/auth/auth.module.ts" "$PROJECT_DIR/src/auth/auth.module.ts"

echo "✅ Файлы скопированы"

# Подключаемся к серверу и выполняем команды
echo "📦 Устанавливаю зависимости..."
ssh -i "$SSH_KEY" "$SERVER" "cd $PROJECT_DIR && npm install cookie-parser @types/cookie-parser"

echo "🗄️ Запускаю миграции..."
ssh -i "$SSH_KEY" "$SERVER" "cd $PROJECT_DIR && npm run migration:run"

echo "🔨 Собираю проект..."
ssh -i "$SSH_KEY" "$SERVER" "cd $PROJECT_DIR && npm run build"

echo "🔄 Перезапускаю приложение..."
# Проверяем, как запущено приложение (PM2, systemd, или docker)
ssh -i "$SSH_KEY" "$SERVER" "cd $PROJECT_DIR && (pm2 restart loginus-backend 2>/dev/null || systemctl restart loginus-backend 2>/dev/null || docker-compose restart backend 2>/dev/null || echo '⚠️ Не удалось автоматически перезапустить. Перезапустите вручную.')"

echo "✅ Деплой завершен!"
echo "📚 Проверьте Swagger документацию: http://45.144.176.42:3001/api/docs"

