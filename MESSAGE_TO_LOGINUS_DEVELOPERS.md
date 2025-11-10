# Сообщение для разработчиков Loginus

## Проблема с OAuth Redirect для Vselena Service

### Информация о клиенте

- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Redirect URI для добавления**: `https://vselena.ldmco.ru/api/auth/callback`

### Проблема

После авторизации в Loginus пользователь **не перенаправляется обратно** на `https://vselena.ldmco.ru/api/auth/callback`.

В наших логах **нет записей** о callback-запросах от Loginus.

### Текущий статус

✅ **Redirect URI добавлен в БД:**
```sql
SELECT "clientId", name, "redirectUris", "isActive" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';

-- Результат:
-- clientId: ad829ce93adefd15b0804e88e150062c
-- name: Vselena Service
-- redirectUris: {https://vselena.ldmco.ru/api/auth/callback}
-- isActive: true
```

✅ **SSL настроен** (оценка A)  
✅ **Endpoint доступен**: `https://vselena.ldmco.ru/api/auth/callback`  
❌ **Редирект не выполняется** после авторизации

### Что проверить в Loginus

1. **Добавлен ли redirect URI в настройки приложения?**
   - ✅ Проверено: Redirect URI добавлен в БД

2. **Правильно ли он указан?**
   - ✅ Проверено: Указан точно `https://vselena.ldmco.ru/api/auth/callback`

3. **Есть ли ошибки в логах Loginus при авторизации?**
   - ⚠️ **Требуется проверка**: Проверить логи при попытке авторизации
   - Команда: `docker logs loginus-backend 2>&1 | grep -E 'OAuth|authorize|redirect|vselena|User authorized'`

4. **Выполняется ли код редиректа?**
   - ⚠️ **Требуется проверка**: Проверить метод `authorize` в `oauth.controller.ts` (строки ~186-200)
   - Убедиться, что `res.redirect(redirectUrl.toString())` выполняется
   - Проверить, есть ли логирование редиректа (на сервере логирования нет)

### Ожидаемое поведение

1. Пользователь на `https://vselena.ldmco.ru/` → нажимает "Войти"
2. Редирект на `https://loginus.startapus.com/oauth/authorize?client_id=ad829ce93adefd15b0804e88e150062c&redirect_uri=https://vselena.ldmco.ru/api/auth/callback&response_type=code&scope=openid+email+profile+organizations+roles+permissions&state=...`
3. Авторизация в Loginus
4. **Редирект обратно** на `https://vselena.ldmco.ru/api/auth/callback?code=...&state=...`

**Текущее поведение:** Шаги 1-3 работают, шаг 4 не выполняется.

### Технические детали

**Файлы для проверки:**
- `src/auth/controllers/oauth.controller.ts` - метод `authorize` (строки ~186-200)
- `src/auth/services/oauth.service.ts` - метод `validateRedirectUri`

**Код редиректа (должен выполняться):**
```typescript
// Редиректим на redirect_uri с code
const redirectUrl = new URL(finalRedirectUri);
redirectUrl.searchParams.set('code', code);
if (finalState) {
  redirectUrl.searchParams.set('state', finalState);
}

return res.redirect(redirectUrl.toString());
```

**Примечание:** На сервере нет логирования редиректа. Рекомендуется добавить логирование для диагностики:
```typescript
console.log(`✅ [OAuth] User authorized, redirecting to: ${finalRedirectUri}`);
console.log(`✅ [OAuth] Full redirect URL: ${redirectUrl.toString()}`);
console.log(`✅ [OAuth] Code: ${code.substring(0, 10)}...`);
console.log(`✅ [OAuth] State: ${finalState || 'none'}`);
```

### Рекомендации по диагностике

1. Проверить логи Loginus при попытке авторизации
2. Убедиться, что метод `res.redirect()` выполняется
3. Проверить валидацию Redirect URI (метод `validateRedirectUri`)
4. Добавить подробное логирование в метод `authorize`
5. Проверить, нет ли ошибок при создании `redirectUrl` или выполнении редиректа

---

**Дата**: 10 ноября 2025  
**Статус**: Требуется диагностика в Loginus

