-- Обновление пароля суперадмина admin@loginus.ru
-- Пароль: admin123
-- Хеш будет сгенерирован на сервере

-- Сначала проверим текущий хеш
SELECT email, LEFT("passwordHash", 50) as hash_start FROM users WHERE email = 'admin@loginus.ru';

-- Обновим пароль (хеш нужно сгенерировать на сервере)
-- UPDATE users SET "passwordHash" = '$2b$12$...' WHERE email = 'admin@loginus.ru';

