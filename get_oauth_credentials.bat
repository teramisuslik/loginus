@echo off
echo ========================================
echo Получение OAuth credentials для SV_ERP
echo ========================================
echo.

echo Шаг 1: Подключение к серверу и поиск контейнера PostgreSQL...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker ps --format '{{.Names}}' | findstr postgres"
echo.

echo Шаг 2: Выполнение SQL для создания OAuth клиента...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i $(docker ps -q -f name=postgres | head -1) psql -U postgres -d loginus -c \"INSERT INTO oauth_clients (id, \"clientId\", \"clientSecret\", name, \"redirectUris\", scopes, \"isActive\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), encode(gen_random_bytes(16), 'hex'), encode(gen_random_bytes(32), 'hex'), 'SV ERP Backend', ARRAY['http://localhost:4000/api/auth/callback', 'http://localhost:3000/auth/callback'], ARRAY['openid', 'email', 'profile'], true, NOW(), NOW()) RETURNING \"clientId\", \"clientSecret\";\""

pause

