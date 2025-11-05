#!/bin/bash
# Скрипт для деплоя файлов на сервер

SSH_KEY="C:/Users/teramisuslik/.ssh/id_ed255a19"
SERVER="root@45.144.176.42"

echo "📤 Загружаю frontend/index.html на сервер..."
scp -i "$SSH_KEY" frontend/index.html "$SERVER:/tmp/index.html"

echo "✅ Файл загружен"
echo ""
echo "📋 Выполняю команды на сервере..."

ssh -i "$SSH_KEY" "$SERVER" << 'ENDSSH'
cd /opt/vselena_back
cp /tmp/index.html frontend/index.html
docker cp frontend/index.html loginus-backend:/app/frontend/index.html

echo "✅ Файл скопирован в контейнер"
echo ""
echo "Проверка:"
docker exec loginus-backend grep -n "НЕ СКРЫВАЕМ ФОРМУ" /app/frontend/index.html
docker exec loginus-backend grep -n "api/oauth/authorize" /app/frontend/index.html | head -3
echo ""
echo "✅ Деплой завершен!"
ENDSSH

