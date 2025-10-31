# 📱 Настройка SmsAero и Telegram Bot для SMS

## 🚀 SmsAero (Рекомендуется)

### Преимущества:
- ✅ **Бесплатные тестовые SMS** (до 5 штук)
- ✅ **Простая настройка** (только email + API ключ)
- ✅ **Работает в России**
- ✅ **Нет проблем с именами отправителей**

### Настройка:

1. **Регистрация на SmsAero**
   - Перейдите на https://smsaero.ru
   - Нажмите "Регистрация"
   - Заполните форму (email, пароль, телефон)
   - Подтвердите email

2. **Получение API ключа**
   - Войдите в личный кабинет
   - Перейдите в "API" → "Настройки"
   - Скопируйте "API ключ"

3. **Обновление docker-compose.yml**
   ```yaml
   SMSAERO_EMAIL: your-email@example.com
   SMSAERO_API_KEY: your-api-key-here
   SMSAERO_FROM: Vselena
   ```

4. **Перезапуск**
   ```bash
   docker-compose restart backend
   ```

---

## 🤖 Telegram Bot (Бесплатно)

### Преимущества:
- ✅ **Полностью бесплатно**
- ✅ **Мгновенная доставка**
- ✅ **Не требует SMS-провайдера**
- ✅ **Можно отправлять на любой чат**

### Настройка:

1. **Создание Telegram Bot**
   - Найдите @BotFather в Telegram
   - Отправьте `/newbot`
   - Придумайте имя бота (например: "Vselena SMS Bot")
   - Придумайте username (например: "vselena_sms_bot")
   - Скопируйте **токен** (выглядит как `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Получение Chat ID**
   - Найдите @userinfobot в Telegram
   - Отправьте любое сообщение
   - Скопируйте **Chat ID** (число, например: `123456789`)

3. **Обновление docker-compose.yml**
   ```yaml
   TELEGRAM_BOT_TOKEN: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID: 123456789
   ```

4. **Перезапуск**
   ```bash
   docker-compose restart backend
   ```

---

## 🧪 Тестирование

### Тест SmsAero:
```bash
curl -X POST http://localhost:3001/api/two-factor/send-code \
  -H "Content-Type: application/json" \
  -d '{"type":"sms","contact":"+79189562230"}'
```

### Тест Telegram:
```bash
curl -X POST http://localhost:3001/api/two-factor/send-code \
  -H "Content-Type: application/json" \
  -d '{"type":"sms","contact":"+79189562230"}'
```

### Логи:
```bash
docker logs vselena-backend --tail 20
```

---

## 🔄 Приоритет отправки

1. **SmsAero** (если настроен)
2. **Telegram** (если настроен)
3. **Fallback** (в консоль)

---

## 💡 Рекомендации

### Для разработки:
- Используйте **Telegram Bot** (бесплатно, мгновенно)

### Для продакшена:
- Используйте **SmsAero** (надежно, дешево)
- **Telegram** как резерв

### Комбинированный подход:
- Настройте оба сервиса
- SmsAero для реальных SMS
- Telegram для уведомлений админов

---

## 🆘 Решение проблем

### SmsAero не работает:
- Проверьте email и API ключ
- Убедитесь, что аккаунт подтвержден
- Проверьте баланс (должен быть > 0)

### Telegram не работает:
- Проверьте токен бота
- Проверьте Chat ID
- Убедитесь, что бот не заблокирован

### Оба не работают:
- Проверьте интернет-соединение
- Проверьте логи: `docker logs vselena-backend`
- Используйте fallback (коды в консоли)
