# Проблема с OAuth Redirect для Vselena Service

## Информация для разработчиков Loginus

### Данные OAuth клиента

- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Название**: Vselena Service
- **Redirect URI для добавления**: `https://vselena.ldmco.ru/api/auth/callback`

### Текущий статус в базе данных

Redirect URI **уже добавлен** в базу данных:

```sql
SELECT "clientId", name, "redirectUris", "isActive" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
```

**Результат:**
```
clientId: ad829ce93adefd15b0804e88e150062c
name: Vselena Service
redirectUris: {https://vselena.ldmco.ru/api/auth/callback}
isActive: true
```

### Описание проблемы

**Симптомы:**
1. После авторизации в Loginus пользователь **не перенаправляется обратно** на `https://vselena.ldmco.ru/api/auth/callback`
2. В логах Vselena Service **нет записей** о callback-запросах от Loginus
3. SSL настроен корректно (оценка A)
4. Endpoint `https://vselena.ldmco.ru/api/auth/callback` доступен

**Ожидаемое поведение:**
1. Пользователь переходит на `https://vselena.ldmco.ru/`
2. Нажимает "Войти"
3. Перенаправляется на `https://loginus.startapus.com/oauth/authorize?client_id=ad829ce93adefd15b0804e88e150062c&redirect_uri=https://vselena.ldmco.ru/api/auth/callback&response_type=code&scope=openid+email+profile+organizations+roles+permissions&state=...`
4. Авторизуется в Loginus
5. **Должен быть перенаправлен обратно** на `https://vselena.ldmco.ru/api/auth/callback?code=...&state=...`

**Текущее поведение:**
- Шаги 1-4 работают корректно
- Шаг 5 **не выполняется** - пользователь остается на странице Loginus

### Что проверить в Loginus

#### 1. Проверка Redirect URI в базе данных

Убедитесь, что Redirect URI точно указан в базе данных:

```sql
SELECT "clientId", name, "redirectUris", "isActive" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
```

**Ожидаемый результат:**
- `redirectUris` должен содержать: `{https://vselena.ldmco.ru/api/auth/callback}`
- `isActive` должен быть `true`

#### 2. Проверка валидации Redirect URI

Проверьте метод `validateRedirectUri` в `oauth.service.ts`:

- Убедитесь, что валидация работает корректно
- Проверьте, что сравнение URI выполняется с учетом регистра и trailing slash
- Убедитесь, что `redirect_uri` из запроса точно совпадает с URI в базе данных

#### 3. Проверка метода редиректа

Проверьте метод `authorize` в `oauth.controller.ts` (строки ~186-200):

```typescript
// Редиректим на redirect_uri с code
const redirectUrl = new URL(finalRedirectUri);
redirectUrl.searchParams.set('code', code);
if (finalState) {
  redirectUrl.searchParams.set('state', finalState);
}

return res.redirect(redirectUrl.toString());
```

**Что проверить:**
- Выполняется ли этот код после успешной авторизации?
- Есть ли ошибки при создании `redirectUrl`?
- Выполняется ли `res.redirect()`?
- Какие логи выводятся при редиректе?

#### 4. Проверка логов Loginus

Проверьте логи при попытке авторизации:

```bash
docker logs loginus-backend 2>&1 | grep -E 'OAuth|authorize|redirect|vselena|User authorized'
```

**Что искать:**
- Логи валидации Redirect URI
- Логи создания authorization code
- Логи редиректа на `vselena.ldmco.ru`
- Ошибки при выполнении редиректа

#### 5. Проверка CORS и безопасности

Убедитесь, что:
- CORS настроен для разрешения редиректов на `vselena.ldmco.ru`
- Нет блокировок по безопасности для внешних редиректов
- SSL сертификат `vselena.ldmco.ru` валиден

### Технические детали

**Файлы для проверки:**
- `src/auth/controllers/oauth.controller.ts` - метод `authorize`
- `src/auth/services/oauth.service.ts` - метод `validateRedirectUri`
- `src/auth/services/oauth.service.ts` - метод `createAuthorizationCode`

**Endpoint для тестирования:**
```
GET /api/oauth/authorize?client_id=ad829ce93adefd15b0804e88e150062c&redirect_uri=https://vselena.ldmco.ru/api/auth/callback&response_type=code&scope=openid+email+profile+organizations+roles+permissions&state=test123
```

### Дополнительная информация

**На стороне Vselena Service:**
- ✅ SSL настроен (оценка A)
- ✅ Endpoint доступен: `https://vselena.ldmco.ru/api/auth/callback`
- ✅ Логи готовы к приему callback-запросов
- ❌ Callback-запросы не приходят

**На стороне Loginus:**
- ✅ Redirect URI добавлен в БД
- ✅ OAuth flow инициируется корректно
- ✅ Авторизация проходит успешно
- ❓ Редирект не выполняется (требует проверки)

### Рекомендации по диагностике

1. **Добавить подробное логирование** в метод `authorize`:
   ```typescript
   console.log(`✅ [OAuth] User authorized, redirecting to: ${finalRedirectUri}`);
   console.log(`✅ [OAuth] Full redirect URL: ${redirectUrl.toString()}`);
   console.log(`✅ [OAuth] Code: ${code.substring(0, 10)}...`);
   console.log(`✅ [OAuth] State: ${finalState || 'none'}`);
   ```

2. **Проверить выполнение кода редиректа** - добавить try-catch:
   ```typescript
   try {
     return res.redirect(redirectUrl.toString());
   } catch (error) {
     console.error(`❌ [OAuth] Redirect error:`, error);
     throw error;
   }
   ```

3. **Проверить валидацию Redirect URI** - убедиться, что она проходит:
   ```typescript
   const isValidRedirect = await this.oauthService.validateRedirectUri(finalClientId, finalRedirectUri);
   console.log(`🔍 [OAuth] Redirect URI validation: ${isValidRedirect}`);
   ```

### Контакты

Если нужна дополнительная информация или доступ к логам, пожалуйста, свяжитесь с командой Vselena Service.

---

**Дата создания**: 10 ноября 2025  
**Статус**: Требуется диагностика в Loginus

