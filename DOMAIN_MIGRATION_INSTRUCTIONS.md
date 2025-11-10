# Инструкция по миграции домена с vselena.ldmco.ru на loginus.startapus.com

## ✅ Выполнено в коде

Все упоминания домена `vselena.ldmco.ru` заменены на `loginus.startapus.com` в следующих файлах:

### Backend:
- `loginus-backend/src/auth/controllers/oauth.controller.ts`
- `loginus-backend/src/auth/controllers/multi-auth.controller.ts`
- `loginus-backend/src/main.ts` (CORS настройки)
- `loginus-backend/docker-compose.yml` (FRONTEND_URL, GITHUB_REDIRECT_URI)
- `loginus-backend/src/auth/micro-modules/referral-system/referral.controller.ts`
- `loginus-backend/src/auth/micro-modules/referral-system/referral.service.ts`

### Frontend:
- `frontend/index.html` (все упоминания)
- `frontend/telegram-login.html`
- `frontend/dashboard_server.html`

### Другие файлы:
- `get_user_info.py`

## ⚠️ Требуется выполнить на сервере

### 1. Создание бэкапа

**ВАЖНО:** Перед любыми изменениями на сервере создайте бэкап!

Выполните на сервере:
```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42

# На сервере:
cd /opt/vselena_back
BACKUP_FILE="/root/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" .
ls -lh "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"
```

### 2. Обновление переменных окружения на сервере

Найдите и обновите файлы с переменными окружения:

```bash
# Проверьте .env файлы
grep -r "vselena.ldmco.ru" /opt/vselena_back/

# Обновите переменные окружения в docker-compose.yml или .env файлах
# FRONTEND_URL=https://loginus.startapus.com
# API_BASE_URL=https://loginus.startapus.com/api
# GITHUB_REDIRECT_URI=https://loginus.startapus.com/api/auth/multi/oauth/github/callback
```

### 3. Обновление конфигурации Nginx

Обновите конфигурацию Nginx для нового домена:

```bash
# Найдите конфигурацию Nginx
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/conf.d/

# Обновите server_name с vselena.ldmco.ru на loginus.startapus.com
# Проверьте SSL сертификаты для нового домена
```

### 4. Обновление SSL сертификатов

Убедитесь, что SSL сертификаты настроены для нового домена:

```bash
# Если используете Let's Encrypt:
certbot --nginx -d loginus.startapus.com

# Или обновите конфигурацию вручную
```

### 5. Обновление GitHub OAuth App

**ВАЖНО:** Обновите callback URL в настройках GitHub OAuth App:

1. Перейдите в GitHub Settings → Developer settings → OAuth Apps
2. Найдите ваше приложение
3. Обновите Authorization callback URL на:
   `https://loginus.startapus.com/api/auth/multi/oauth/github/callback`

### 6. Перезапуск сервисов

После обновления конфигурации:

```bash
# Перезапустите Docker контейнеры
cd /opt/vselena_back
docker-compose down
docker-compose up -d

# Или если используете отдельные команды:
docker restart loginus-backend

# Перезагрузите Nginx
nginx -t  # Проверка конфигурации
systemctl reload nginx
```

### 7. Проверка работы

Проверьте, что все работает:

```bash
# Проверьте доступность API
curl https://loginus.startapus.com/api/docs

# Проверьте фронтенд
curl https://loginus.startapus.com/index.html

# Проверьте логи
docker logs loginus-backend
```

## 📝 Дополнительные файлы для обновления (не критично)

Документация содержит упоминания старого домена, но это не влияет на работу приложения:
- Различные .md файлы с документацией
- Примеры в документации

Эти файлы можно обновить позже для актуальности документации.

## 🔄 Откат изменений (если что-то пошло не так)

Если возникли проблемы, можно откатить изменения:

```bash
# На сервере:
cd /opt/vselena_back
# Найдите последний бэкап
ls -lh /root/backup_*.tar.gz

# Восстановите из бэкапа
tar -xzf /root/backup_YYYYMMDD_HHMMSS.tar.gz -C /opt/vselena_back

# Перезапустите сервисы
docker-compose restart
```

