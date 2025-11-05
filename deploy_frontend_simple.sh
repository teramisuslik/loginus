#!/bin/bash
# Простой скрипт для деплоя frontend/index.html

echo "=========================================="
echo "Деплой frontend/index.html на сервер"
echo "=========================================="
echo ""

# Шаг 1: Загрузка на сервер
echo "📤 Шаг 1: Загружаю файл на сервер..."
scp -i ~/.ssh/id_ed25519 frontend/index.html root@45.144.176.42:/tmp/index.html

if [ $? -eq 0 ]; then
    echo "✅ Файл загружен на /tmp/index.html"
else
    echo "❌ Ошибка загрузки файла"
    exit 1
fi

echo ""
echo "=========================================="
echo "📋 Теперь выполните на сервере:"
echo "=========================================="
echo ""
echo "ssh -i ~/.ssh/id_ed25519 root@45.144.176.42"
echo ""
echo "Затем выполните следующие команды:"
echo ""
echo "cd /opt/vselena_back"
echo "cp /tmp/index.html frontend/index.html"
echo "docker cp frontend/index.html loginus-backend:/app/frontend/index.html"
echo ""
echo "Проверка (должна быть строка 'НЕ СКРЫВАЕМ ФОРМУ'):"
echo "docker exec loginus-backend grep -n 'НЕ СКРЫВАЕМ ФОРМУ' /app/frontend/index.html"
echo ""
echo "Проверка редиректа (должно быть 'api/oauth/authorize'):"
echo "docker exec loginus-backend grep -n 'api/oauth/authorize' /app/frontend/index.html | head -3"
echo ""
echo "После деплоя очистите кеш браузера (Ctrl+Shift+R)"

