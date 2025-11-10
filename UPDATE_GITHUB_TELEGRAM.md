# Инструкция по обновлению домена в GitHub и Telegram

## 🔧 Обновление GitHub OAuth App

### Шаг 1: Откройте настройки OAuth App в GitHub

1. Перейдите на https://github.com/settings/developers
2. Войдите в свой аккаунт GitHub
3. В левом меню выберите **"OAuth Apps"** (или **"Developer settings" → "OAuth Apps"**)

### Шаг 2: Найдите ваше приложение

Найдите приложение с **Client ID**: `Ov23li3523l5PKz1Jblw`

### Шаг 3: Обновите Authorization callback URL

1. Нажмите на название приложения, чтобы открыть его настройки
2. Найдите поле **"Authorization callback URL"**
3. Замените старый URL:
   ```
   https://vselena.ldmco.ru/api/auth/multi/oauth/github/callback
   ```
   на новый:
   ```
   https://loginus.startapus.com/api/auth/multi/oauth/github/callback
   ```
4. Нажмите **"Update application"** (или **"Save"**)

### Шаг 4: Проверка

После обновления callback URL должен быть:
- ✅ `https://loginus.startapus.com/api/auth/multi/oauth/github/callback`

---

## 🤖 Обновление Telegram Bot

### Важно:
Telegram Bot в вашем проекте используется **только для отправки SMS/уведомлений**, а не для webhook. Поэтому обновление домена в Telegram не требуется.

Однако, если вы используете Telegram Bot для авторизации через webhook, выполните следующие шаги:

### Шаг 1: Получите информацию о текущем webhook

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Замените `<YOUR_BOT_TOKEN>` на ваш токен: `8232490271:AAEEvq-yBnFrv0AnSzF2dpFklVT7Wd8Xyyk`

### Шаг 2: Удалите старый webhook (если установлен)

```bash
curl -X POST https://api.telegram.org/bot8232490271:AAEEvq-yBnFrv0AnSzF2dpFklVT7Wd8Xyyk/deleteWebhook
```

### Шаг 3: Установите новый webhook (если используется)

Если у вас есть endpoint для Telegram webhook, установите его:

```bash
curl -X POST https://api.telegram.org/bot8232490271:AAEEvq-yBnFrv0AnSzF2dpFklVT7Wd8Xyyk/setWebhook \
  -d "url=https://loginus.startapus.com/api/auth/multi/oauth/telegram/callback"
```

**Примечание:** Проверьте, какой именно endpoint используется для Telegram в вашем коде.

---

## ✅ Проверка работы

### GitHub OAuth:
1. Попробуйте авторизоваться через GitHub на новом домене
2. Проверьте, что редирект работает корректно

### Telegram:
1. Если используется webhook, проверьте логи бэкенда
2. Убедитесь, что бот получает обновления

---

## 📝 Текущие настройки

**GitHub OAuth:**
- Client ID: `Ov23li3523l5PKz1Jblw`
- Callback URL: `https://loginus.startapus.com/api/auth/multi/oauth/github/callback` (требует обновления в GitHub)

**Telegram Bot:**
- Token: `8232490271:AAEEvq-yBnFrv0AnSzF2dpFklVT7Wd8Xyyk`
- Chat ID: `1063129435`
- Использование: отправка SMS/уведомлений (webhook не требуется)

