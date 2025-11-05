#!/bin/bash
# Скрипт для деплоя frontend/index.html на сервер

SSH_KEY="C:\\Users\\teramisuslik\\.ssh\\id_ed255a19"
SERVER="root@45.144.176.42"
LOCAL_FILE="frontend/index.html"
REMOTE_TMP="/tmp/index.html"
REMOTE_PATH="/opt/vselena_back/frontend/index.html"
CONTAINER_PATH="/app/frontend/index.html"

echo "📤 Загружаю frontend/index.html на сервер..."
scp -i "$SSH_KEY" "$LOCAL_FILE" "$SERVER:$REMOTE_TMP"

echo "✅ Файл загружен на $REMOTE_TMP"
echo ""
echo "📋 Теперь выполните на сервере:"
echo ""
echo "ssh -i $SSH_KEY $SERVER"
echo ""
echo "Затем выполните:"
echo "cd /opt/vselena_back"
echo "cp /tmp/index.html frontend/"
echo "docker cp frontend/index.html loginus-backend:$CONTAINER_PATH"
echo ""
echo "Проверка:"
echo "docker exec loginus-backend grep -n 'НЕ СКРЫВАЕМ ФОРМУ' $CONTAINER_PATH"
echo "docker exec loginus-backend grep -n 'api/oauth/authorize' $CONTAINER_PATH | head -5"

