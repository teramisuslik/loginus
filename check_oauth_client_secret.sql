-- Проверка client_secret для OAuth клиента Vselena Service
-- Client ID: ad829ce93adefd15b0804e88e150062c

SELECT 
    "clientId",
    "clientSecret",
    name,
    "redirectUris",
    scopes,
    "isActive",
    "createdAt",
    "updatedAt"
FROM oauth_clients
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

-- Проверка, есть ли redirect_uri для vselena.ldmco.ru
SELECT 
    "clientId",
    name,
    "redirectUris",
    CASE 
        WHEN 'https://vselena.ldmco.ru/api/auth/callback' = ANY("redirectUris") 
        THEN '✅ Redirect URI найден'
        ELSE '❌ Redirect URI не найден'
    END as redirect_uri_status
FROM oauth_clients
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

