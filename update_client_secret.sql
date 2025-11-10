-- Обновление client_secret для OAuth клиента Vselena Service
UPDATE oauth_clients
SET 
    "clientSecret" = '399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254',
    "updatedAt" = NOW()
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

-- Проверка обновления
SELECT 
    "clientId",
    "clientSecret",
    name,
    "redirectUris",
    "isActive",
    "updatedAt"
FROM oauth_clients
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

