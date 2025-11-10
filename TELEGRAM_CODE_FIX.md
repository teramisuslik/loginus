# Исправление проблемы с отправкой кодов подтверждения через Telegram

## Проблема
При попытке войти через Telegram не приходит код подтверждения.

## Причина
В enum `two_factor_codes_type_enum` в базе данных отсутствовали значения `telegram` и `github`. При попытке сохранить код с типом `telegram` возникала ошибка:

```
error: invalid input value for enum two_factor_codes_type_enum: "telegram"
```

## Решение
Добавлены недостающие значения в enum:

```sql
ALTER TYPE two_factor_codes_type_enum ADD VALUE IF NOT EXISTS 'telegram';
ALTER TYPE two_factor_codes_type_enum ADD VALUE IF NOT EXISTS 'github';
```

## Проверка

**До исправления:**
```sql
SELECT unnest(enum_range(NULL::two_factor_codes_type_enum));
-- Результат: email, sms
```

**После исправления:**
```sql
SELECT unnest(enum_range(NULL::two_factor_codes_type_enum));
-- Результат: email, sms, telegram, github
```

## Статус
✅ Enum обновлен, коды подтверждения через Telegram теперь должны отправляться корректно.

## Дополнительная информация

### Конфигурация Telegram бота:
- `TELEGRAM_BOT_TOKEN`: настроен
- `TELEGRAM_CHAT_ID`: настроен

### Процесс отправки кода:
1. Пользователь пытается войти через Telegram
2. Система генерирует 6-значный код
3. Код сохраняется в таблицу `two_factor_codes` с типом `telegram`
4. Код отправляется через Telegram Bot API на chatId пользователя
5. Пользователь получает код в Telegram

### Важно:
- Telegram Bot может отправлять сообщения только если пользователь начал диалог с ботом или авторизовался через Telegram Login Widget
- Код действителен 10 минут
- Максимальное количество попыток: 3

