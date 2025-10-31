-- Проверяем текущий хэш пароля
SELECT id, email, "passwordHash" FROM users WHERE email = 'admin@loginus.ru';

-- Устанавливаем новый пароль: Admin123!
-- Хэш для пароля Admin123! (bcrypt с 12 раундами)
UPDATE users 
SET "passwordHash" = '$2b$12$0is9S6IlFRJ/edh9ROLtUuFa4K.ycpzr/jTAwkcX0xgaQ9dADwHHK',
    "updatedAt" = NOW()
WHERE email = 'admin@loginus.ru';

-- Проверяем результат
SELECT id, email, "passwordHash", "updatedAt" FROM users WHERE email = 'admin@loginus.ru';
