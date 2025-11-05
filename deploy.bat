@echo off
echo ==========================================
echo Deploy OAuth functionality to server
echo ==========================================
echo.

set SSH_KEY=C:\Users\teramisuslik\.ssh\id_ed25519
set SERVER=root@45.144.176.42
set PROJECT_DIR=/root/loginus-backend

echo [1/10] Creating directories on server...
ssh -i %SSH_KEY% %SERVER% "mkdir -p %PROJECT_DIR%/src/auth/entities %PROJECT_DIR%/src/auth/services %PROJECT_DIR%/src/auth/controllers %PROJECT_DIR%/src/auth/dto %PROJECT_DIR%/src/database/migrations"
if errorlevel 1 (
    echo ERROR: Failed to create directories
    pause
    exit /b 1
)

echo [2/10] Copying oauth-client.entity.ts...
scp -i %SSH_KEY% loginus-backend\src\auth\entities\oauth-client.entity.ts %SERVER%:%PROJECT_DIR%/src/auth/entities/
if errorlevel 1 (
    echo ERROR: Failed to copy oauth-client.entity.ts
    pause
    exit /b 1
)

echo [3/10] Copying authorization-code.entity.ts...
scp -i %SSH_KEY% loginus-backend\src\auth\entities\authorization-code.entity.ts %SERVER%:%PROJECT_DIR%/src/auth/entities/
if errorlevel 1 (
    echo ERROR: Failed to copy authorization-code.entity.ts
    pause
    exit /b 1
)

echo [4/10] Copying oauth.service.ts...
scp -i %SSH_KEY% loginus-backend\src\auth\services\oauth.service.ts %SERVER%:%PROJECT_DIR%/src/auth/services/
if errorlevel 1 (
    echo ERROR: Failed to copy oauth.service.ts
    pause
    exit /b 1
)

echo [5/10] Copying oauth.controller.ts...
scp -i %SSH_KEY% loginus-backend\src\auth\controllers\oauth.controller.ts %SERVER%:%PROJECT_DIR%/src/auth/controllers/
if errorlevel 1 (
    echo ERROR: Failed to copy oauth.controller.ts
    pause
    exit /b 1
)

echo [6/10] Copying oauth-token.dto.ts...
scp -i %SSH_KEY% loginus-backend\src\auth\dto\oauth-token.dto.ts %SERVER%:%PROJECT_DIR%/src/auth/dto/
if errorlevel 1 (
    echo ERROR: Failed to copy oauth-token.dto.ts
    pause
    exit /b 1
)

echo [7/10] Copying migration file...
scp -i %SSH_KEY% loginus-backend\src\database\migrations\1761343000000-CreateOAuthTables.ts %SERVER%:%PROJECT_DIR%/src/database/migrations/
if errorlevel 1 (
    echo ERROR: Failed to copy migration file
    pause
    exit /b 1
)

echo [8/10] Copying package.json...
scp -i %SSH_KEY% loginus-backend\package.json %SERVER%:%PROJECT_DIR%/
if errorlevel 1 (
    echo ERROR: Failed to copy package.json
    pause
    exit /b 1
)

echo [9/10] Copying main.ts...
scp -i %SSH_KEY% loginus-backend\src\main.ts %SERVER%:%PROJECT_DIR%/src/
if errorlevel 1 (
    echo ERROR: Failed to copy main.ts
    pause
    exit /b 1
)

echo [10/10] Copying auth.module.ts...
scp -i %SSH_KEY% loginus-backend\src\auth\auth.module.ts %SERVER%:%PROJECT_DIR%/src/auth/
if errorlevel 1 (
    echo ERROR: Failed to copy auth.module.ts
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Files copied successfully!
echo ==========================================
echo.
echo Now installing dependencies on server...
ssh -i %SSH_KEY% %SERVER% "cd %PROJECT_DIR% && npm install cookie-parser @types/cookie-parser"
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Running migrations...
ssh -i %SSH_KEY% %SERVER% "cd %PROJECT_DIR% && npm run migration:run"
if errorlevel 1 (
    echo ERROR: Failed to run migrations
    pause
    exit /b 1
)

echo.
echo Building project...
ssh -i %SSH_KEY% %SERVER% "cd %PROJECT_DIR% && npm run build"
if errorlevel 1 (
    echo ERROR: Failed to build project
    pause
    exit /b 1
)

echo.
echo Restarting application...
ssh -i %SSH_KEY% %SERVER% "cd %PROJECT_DIR% && (pm2 restart loginus-backend 2>nul || systemctl restart loginus-backend 2>nul || docker-compose restart backend 2>nul || echo 'Please restart manually')"

echo.
echo ==========================================
echo Deployment completed!
echo ==========================================
echo.
echo Check Swagger docs: http://45.144.176.42:3001/api/docs
echo.
pause

