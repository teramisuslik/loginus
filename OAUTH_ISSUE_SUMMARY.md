# Проблема с OAuth Redirect - Краткая информация для разработчиков Loginus

## Данные OAuth клиента

- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Redirect URI**: `https://vselena.ldmco.ru/api/auth/callback`

## Проблема

После авторизации в Loginus пользователь **не перенаправляется обратно** на `https://vselena.ldmco.ru/api/auth/callback`.

В логах Vselena Service нет записей о callback-запросах от Loginus.

## Текущий статус

✅ **Redirect URI добавлен в БД:**
```sql
SELECT "clientId", name, "redirectUris", "isActive" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

-- Результат:
-- redirectUris: {https://vselena.ldmco.ru/api/auth/callback}
-- isActive: true
```

✅ **SSL настроен** (оценка A)  
✅ **Endpoint доступен**: `https://vselena.ldmco.ru/api/auth/callback`  
❌ **Редирект не выполняется** после авторизации

## Что проверить в Loginus

1. **Добавлен ли redirect URI в настройки приложения?**
   - Проверить в БД: `SELECT "redirectUris" FROM oauth_clients WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';`
   - ✅ Уже добавлен

2. **Правильно ли он указан?**
   - Должен быть точно: `https://vselena.ldmco.ru/api/auth/callback`
   - ✅ Указан правильно

3. **Есть ли ошибки в логах Loginus при авторизации?**
   - Проверить: `docker logs loginus-backend 2>&1 | grep -E 'OAuth|authorize|redirect|vselena'`
   - Проверить, выполняется ли код редиректа в `oauth.controller.ts` (строки ~186-200)

4. **Выполняется ли редирект?**
   - Проверить метод `authorize` в `oauth.controller.ts`
   - Убедиться, что `res.redirect(redirectUrl.toString())` выполняется
   - Проверить логирование редиректа

## Ожидаемое поведение

1. Пользователь на `https://vselena.ldmco.ru/` → нажимает "Войти"
2. Редирект на `https://loginus.startapus.com/oauth/authorize?client_id=...&redirect_uri=https://vselena.ldmco.ru/api/auth/callback&...`
3. Авторизация в Loginus
4. **Редирект обратно** на `https://vselena.ldmco.ru/api/auth/callback?code=...&state=...`

**Текущее поведение:** Шаги 1-3 работают, шаг 4 не выполняется.

## Рекомендации

1. Проверить логи Loginus при попытке авторизации
2. Убедиться, что метод `res.redirect()` выполняется
3. Проверить валидацию Redirect URI
4. Добавить подробное логирование в метод `authorize`

---

**Дата**: 10 ноября 2025

