# Инструкция по деплою frontend/index.html

## Проблема
Файл `frontend/index.html` был исправлен локально, но изменения не применились на сервере. Форма входа все еще скрывается после успешного входа.

## Решение

### Вариант 1: Прямой деплой через docker cp (рекомендуется)

```bash
# 1. Загрузите файл на сервер
scp -i ~/.ssh/id_ed25519 frontend/index.html root@45.144.176.42:/tmp/index.html

# 2. Подключитесь к серверу
ssh -i ~/.ssh/id_ed25519 root@45.144.176.42

# 3. На сервере выполните:
cd /opt/vselena_back

# 4. Скопируйте файл в локальную директорию (для бэкапа)
cp frontend/index.html frontend/index.html.backup
cp /tmp/index.html frontend/index.html

# 5. Скопируйте файл в контейнер
docker cp frontend/index.html loginus-backend:/app/frontend/index.html

# 6. Проверьте, что файл скопирован корректно
docker exec loginus-backend head -30 /app/frontend/index.html | grep -A 5 "НЕ СКРЫВАЕМ ФОРМУ"

# 7. Проверьте размер файла и дату модификации
docker exec loginus-backend ls -lh /app/frontend/index.html

# 8. Очистите кеш браузера (Ctrl+Shift+R или Ctrl+F5)
```

### Вариант 2: Через volume mount (если используется)

Если в docker-compose.yml используется volume mount `- .:/app`, то файл должен автоматически синхронизироваться. Но нужно убедиться:

```bash
# На сервере
cd /opt/vselena_back
cp /tmp/index.html frontend/index.html

# Проверьте, что volume mount работает
docker exec loginus-backend cat /app/frontend/index.html | head -30 | grep "НЕ СКРЫВАЕМ ФОРМУ"
```

### Вариант 3: Перезапуск контейнера (если нужно)

```bash
# На сервере
docker restart loginus-backend

# Или через docker-compose
cd /opt/vselena_back
docker-compose restart backend
```

## Проверка успешного деплоя

1. **Проверьте код в контейнере:**
```bash
docker exec loginus-backend grep -n "НЕ СКРЫВАЕМ ФОРМУ" /app/frontend/index.html
```

Должна быть строка:
```javascript
// ✅ НЕ СКРЫВАЕМ ФОРМУ: Оставляем форму видимой для проверки редиректа
```

2. **Проверьте редирект на /api/oauth/authorize:**
```bash
docker exec loginus-backend grep -n "api/oauth/authorize" /app/frontend/index.html | head -5
```

3. **Очистите кеш браузера:**
   - Chrome/Edge: Ctrl+Shift+Delete → Очистить кеш
   - Или: Ctrl+Shift+R (hard refresh)

4. **Проверьте через браузер:**
   - Откройте http://localhost/
   - Войдите через Email
   - Форма НЕ должна скрываться после успешного входа
   - Должен произойти редирект на `/api/oauth/authorize`

## Возможные проблемы

### Проблема 1: Nginx кеширует старую версию
```bash
# На сервере, перезапустите nginx
sudo systemctl reload nginx
# Или
sudo nginx -s reload
```

### Проблема 2: Файл в неправильной директории
```bash
# Проверьте, где находится frontend на сервере
docker exec loginus-backend find /app -name "index.html" -type f

# Проверьте структуру директорий
docker exec loginus-backend ls -la /app/frontend/
```

### Проблема 3: Browser cache
Очистите кеш браузера полностью или используйте инкогнито режим.

## Логи для отладки

```bash
# Логи backend контейнера
docker logs loginus-backend --tail 100

# Логи nginx (если используется)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

