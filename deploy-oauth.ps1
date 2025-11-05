# PowerShell скрипт для деплоя OAuth функционала
$ErrorActionPreference = "Stop"

$sshKey = "C:\Users\teramisuslik\.ssh\id_ed25519"
$server = "root@45.144.176.42"
$projectDir = "/root/loginus-backend"
$baseDir = "loginus-backend"

Write-Host "🚀 Начинаем деплой OAuth функционала..." -ForegroundColor Green

# Функция для создания файла на сервере через SSH
function Deploy-File {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    Write-Host "📋 Копирую $LocalPath -> $RemotePath" -ForegroundColor Cyan
    
    # Читаем содержимое файла
    $content = Get-Content -Path $LocalPath -Raw -Encoding UTF8
    
    # Экранируем специальные символы для передачи через SSH
    $escapedContent = $content -replace '"', '\"' -replace '\$', '\$' -replace '`', '\`'
    
    # Создаем директорию на сервере
    $remoteDir = Split-Path -Path $RemotePath -Parent
    ssh -i $sshKey $server "mkdir -p $remoteDir"
    
    # Создаем файл на сервере через heredoc
    $script = @"
cat > $RemotePath << 'EOFMARKER'
$escapedContent
EOFMARKER
"@
    
    echo $script | ssh -i $sshKey $server bash
}

# Копируем новые файлы
Write-Host "📦 Копирую новые файлы..." -ForegroundColor Yellow

Deploy-File "$baseDir\src\auth\entities\oauth-client.entity.ts" "$projectDir/src/auth/entities/oauth-client.entity.ts"
Deploy-File "$baseDir\src\auth\entities\authorization-code.entity.ts" "$projectDir/src/auth/entities/authorization-code.entity.ts"
Deploy-File "$baseDir\src\auth\services\oauth.service.ts" "$projectDir/src/auth/services/oauth.service.ts"
Deploy-File "$baseDir\src\auth\controllers\oauth.controller.ts" "$projectDir/src/auth/controllers/oauth.controller.ts"
Deploy-File "$baseDir\src\auth\dto\oauth-token.dto.ts" "$projectDir/src/auth/dto/oauth-token.dto.ts"
Deploy-File "$baseDir\src\database\migrations\1761343000000-CreateOAuthTables.ts" "$projectDir/src/database/migrations/1761343000000-CreateOAuthTables.ts"

# Копируем обновленные файлы
Write-Host "📝 Копирую обновленные файлы..." -ForegroundColor Yellow

Deploy-File "$baseDir\package.json" "$projectDir/package.json"
Deploy-File "$baseDir\src\main.ts" "$projectDir/src/main.ts"
Deploy-File "$baseDir\src\auth\auth.module.ts" "$projectDir/src/auth/auth.module.ts"

Write-Host "✅ Файлы скопированы" -ForegroundColor Green

# Устанавливаем зависимости
Write-Host "📦 Устанавливаю зависимости..." -ForegroundColor Yellow
ssh -i $sshKey $server "cd $projectDir && npm install cookie-parser @types/cookie-parser"

# Запускаем миграции
Write-Host "🗄️ Запускаю миграции..." -ForegroundColor Yellow
ssh -i $sshKey $server "cd $projectDir && npm run migration:run"

# Собираем проект
Write-Host "🔨 Собираю проект..." -ForegroundColor Yellow
ssh -i $sshKey $server "cd $projectDir && npm run build"

# Перезапускаем приложение
Write-Host "🔄 Перезапускаю приложение..." -ForegroundColor Yellow
ssh -i $sshKey $server "cd $projectDir && (pm2 restart loginus-backend 2>/dev/null || systemctl restart loginus-backend 2>/dev/null || docker-compose restart backend 2>/dev/null || echo '⚠️ Не удалось автоматически перезапустить. Перезапустите вручную.')"

Write-Host "✅ Деплой завершен!" -ForegroundColor Green
Write-Host "📚 Проверьте Swagger документацию: http://45.144.176.42:3001/api/docs" -ForegroundColor Cyan

