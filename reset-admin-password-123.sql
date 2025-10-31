-- Пароль: admin123
UPDATE users 
SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NXGMoIKlQk5W' 
WHERE email = 'admin@vselena.ru';

