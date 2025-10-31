#!/bin/bash

# Скрипт для тестирования системы микромодулей
# Убедитесь, что сервер запущен на localhost:3001

BASE_URL="http://localhost:3001/api"
echo "🧪 Тестирование системы микромодулей Vselena"
echo "=============================================="

# Проверка доступности сервера
echo "📡 Проверка доступности сервера..."
if ! curl -s "$BASE_URL" > /dev/null; then
    echo "❌ Сервер недоступен. Убедитесь, что он запущен на localhost:3001"
    exit 1
fi
echo "✅ Сервер доступен"

# Тестирование endpoints микромодулей
echo ""
echo "🔧 Тестирование endpoints микромодулей..."

# Получить список всех микромодулей
echo "📋 Получение списка всех микромодулей..."
curl -s -X GET "$BASE_URL/micro-modules" | jq '.[] | {name: .name, enabled: .isEnabled, system: .isSystem}' || echo "❌ Ошибка получения списка модулей"

# Получить включенные микромодули
echo ""
echo "✅ Получение включенных микромодулей..."
curl -s -X GET "$BASE_URL/micro-modules/enabled" | jq '.[] | {name: .name, version: .version}' || echo "❌ Ошибка получения включенных модулей"

# Получить статистику (требует авторизации)
echo ""
echo "📊 Получение статистики микромодулей..."
echo "⚠️  Требует авторизации super_admin"

# Тестирование настроек super_admin
echo ""
echo "⚙️  Тестирование настроек super_admin..."

# Получить системные настройки
echo "🔧 Получение системных настроек..."
echo "⚠️  Требует авторизации super_admin"

# Получить настройки функций
echo "🎛️  Получение настроек функций..."
echo "⚠️  Требует авторизации super_admin"

# Тестирование UI элементов
echo ""
echo "🎨 Тестирование UI элементов..."

# Получить UI элементы
echo "🖼️  Получение UI элементов..."
echo "⚠️  Требует авторизации пользователя"

echo ""
echo "✅ Тестирование завершено!"
echo ""
echo "📚 Для полного тестирования с авторизацией используйте:"
echo "   curl -X GET '$BASE_URL/micro-modules' -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "🔑 Для получения токена авторизации:"
echo "   curl -X POST '$BASE_URL/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"admin@vselena.ru\",\"password\":\"admin123\"}'"
