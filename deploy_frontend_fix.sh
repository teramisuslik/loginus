#!/bin/bash
# Скрипт для деплоя исправленного frontend/index.html

echo "📤 Загружаю frontend/index.html на сервер..."

# Загружаем файл на сервер
scp -i ~/.ssh/id_ed25519 frontend/index.html root@45.144.176.42:/tmp/index.html

echo "✅ Файл загружен на /tmp/index.html"
echo ""
echo "📋 Выполните следующие команды на сервере:"
echo ""
echo "ssh -i ~/.ssh/id_ed25519 root@45.144.176.42"
echo ""
echo "Затем на сервере:"
echo "cd /opt/vselena_back"
echo "cp /tmp/index.html frontend/"
echo "docker cp frontend/index.html loginus-backend:/app/frontend/"
echo ""
echo "Проверка:"
echo "docker exec loginus-backend ls -la /app/frontend/index.html"
echo "docker exec loginus-backend head -20 /app/frontend/index.html | grep 'НЕ СКРЫВАЕМ ФОРМУ'"

