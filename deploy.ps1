# PowerShell скрипт для деплоя frontend/index.html
$SSH_KEY = "C:\Users\teramisuslik\.ssh\id_ed255a19"
$SERVER = "root@45.144.176.42"
$LOCAL_FILE = "frontend\index.html"

Write-Host "📤 Загружаю frontend/index.html на сервер..." -ForegroundColor Cyan

# Загрузка файла
& scp -i $SSH_KEY $LOCAL_FILE "${SERVER}:/tmp/index.html"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Файл загружен на /tmp/index.html" -ForegroundColor Green
    
    Write-Host "`n📋 Выполняю команды на сервере..." -ForegroundColor Cyan
    
    # Выполнение команд на сервере
    $commands = @"
cd /opt/vselena_back
cp /tmp/index.html frontend/index.html
docker cp frontend/index.html loginus-backend:/app/frontend/index.html
echo "✅ Файл скопирован в контейнер"
docker exec loginus-backend grep -n "НЕ СКРЫВАЕМ ФОРМУ" /app/frontend/index.html
docker exec loginus-backend grep -n "api/oauth/authorize" /app/frontend/index.html | head -3
echo "✅ Деплой завершен!"
"@
    
    & ssh -i $SSH_KEY $SERVER $commands
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Деплой успешно завершен!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Ошибка при выполнении команд на сервере" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Ошибка загрузки файла на сервер" -ForegroundColor Red
}

