@echo off
echo ========================================
echo Развертывание исправлений и запуск бэкенда
echo ========================================
echo.

echo 1. Копирую github-auth.service.ts на сервер...
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\services\github-auth.service.ts root@45.144.176.42:/tmp/github-auth.service.ts
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скопировать github-auth.service.ts
    pause
    exit /b 1
)
echo [OK] github-auth.service.ts скопирован

echo.
echo 2. Копирую multi-auth.controller.ts на сервер...
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\controllers\multi-auth.controller.ts root@45.144.176.42:/tmp/multi-auth.controller.ts
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скопировать multi-auth.controller.ts
    pause
    exit /b 1
)
echo [OK] multi-auth.controller.ts скопирован

echo.
echo 3. Копирую github-auth.service.ts в контейнер...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker cp /tmp/github-auth.service.ts loginus-backend:/app/src/auth/services/github-auth.service.ts"
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скопировать в контейнер
    pause
    exit /b 1
)
echo [OK] github-auth.service.ts скопирован в контейнер

echo.
echo 4. Копирую multi-auth.controller.ts в контейнер...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker cp /tmp/multi-auth.controller.ts loginus-backend:/app/src/auth/controllers/multi-auth.controller.ts"
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скопировать в контейнер
    pause
    exit /b 1
)
echo [OK] multi-auth.controller.ts скопирован в контейнер

echo.
echo 5. Проверяю статус контейнера loginus-backend...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker ps -a --filter name=loginus-backend --format '{{.Status}}'"
echo.

echo 6. Запускаю/перезапускаю контейнер loginus-backend...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker start loginus-backend 2>nul || docker restart loginus-backend"
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось запустить контейнер
    echo Попробуйте запустить вручную: docker start loginus-backend
    pause
    exit /b 1
)
echo [OK] Контейнер запущен/перезапущен

echo.
echo 7. Проверяю логи контейнера (последние 20 строк)...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker logs loginus-backend --tail 20"
echo.

echo ========================================
echo Готово! Бэкенд развернут и запущен.
echo ========================================
pause


