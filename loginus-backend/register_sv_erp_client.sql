-- Регистрация OAuth клиента для SV_ERP_Backend
-- Redirect URIs:
--   - http://localhost:4000/api/auth/callback (основной callback на бэкенд)
--   - http://localhost:3000/auth/callback (опционально, для прямого редиректа на фронт)

-- Генерируем client_id (32 hex символа = 16 байт)
-- Генерируем client_secret (64 hex символа = 32 байта)
INSERT INTO oauth_clients (id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  encode(gen_random_bytes(16), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  'SV ERP Backend',
  ARRAY[
    'http://localhost:4000/api/auth/callback',
    'http://localhost:3000/auth/callback'
  ],
  ARRAY['openid', 'email', 'profile'],
  true,
  NOW(),
  NOW()
)
RETURNING "clientId", "clientSecret", name, "redirectUris", scopes;

