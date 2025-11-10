-- Проверка текущего redirect_uri для клиента
SELECT "clientId", name, "redirectUris" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

-- Обновление redirect_uri на правильный
UPDATE oauth_clients 
SET "redirectUris" = ARRAY['http://localhost:4000/api/auth/callback']::text[]
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

-- Проверка после обновления
SELECT "clientId", name, "redirectUris" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';


