-- Устанавливаем правильный хэш пароля Admin123!
UPDATE users 
SET "passwordHash" = '$2b$12$7mND3ovxMT1W5KPsFUzydOpMz08JbpGXO2NftS2Mgfee3GKLr7iJK',
    "updatedAt" = NOW()
WHERE email = 'admin@loginus.ru';

-- Проверяем результат
SELECT id, email, "passwordHash", "updatedAt" FROM users WHERE email = 'admin@loginus.ru';
