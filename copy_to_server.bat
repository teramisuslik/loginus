@echo off
echo Копирование файлов на сервер...

echo.
echo 1. Копирую github-auth.service.ts...
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\services\github-auth.service.ts root@45.144.176.42:/tmp/github-auth.service.ts
if %errorlevel% neq 0 (
    echo Ошибка при копировании github-auth.service.ts
    pause
    exit /b 1
)

echo.
echo 2. Копирую multi-auth.controller.ts...
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\src\auth\controllers\multi-auth.controller.ts root@45.144.176.42:/tmp/multi-auth.controller.ts
if %errorlevel% neq 0 (
    echo Ошибка при копировании multi-auth.controller.ts
    pause
    exit /b 1
)

echo.
echo 3. Копирую github-auth.service.ts в контейнер...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker cp /tmp/github-auth.service.ts loginus-backend:/app/src/auth/services/github-auth.service.ts"
if %errorlevel% neq 0 (
    echo Ошибка при копировании в контейнер
    pause
    exit /b 1
)

echo.
echo 4. Копирую multi-auth.controller.ts в контейнер...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker cp /tmp/multi-auth.controller.ts loginus-backend:/app/src/auth/controllers/multi-auth.controller.ts"
if %errorlevel% neq 0 (
    echo Ошибка при копировании в контейнер
    pause
    exit /b 1
)

echo.
echo 5. Перезапускаю контейнер...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker restart loginus-backend"
if %errorlevel% neq 0 (
    echo Ошибка при перезапуске контейнера
    pause
    exit /b 1
)

echo.
echo Готово! Файлы скопированы и контейнер перезапущен.
pause


