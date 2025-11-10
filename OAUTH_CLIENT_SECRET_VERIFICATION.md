# Проверка Client Secret для Vselena Service

## Информация о клиенте

- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Название**: Vselena Service
- **Redirect URI**: `https://vselena.ldmco.ru/api/auth/callback`
- **Предоставленный Client Secret**: `399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254`

## Проверка Client Secret

### Способ 1: Через SQL запрос в базе данных

Выполните на сервере Loginus:

```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
```

Затем подключитесь к базе данных:

```bash
cd /opt/vselena_back
docker exec -it loginus-db psql -U loginus_user -d loginus_dev
```

Выполните SQL запрос:

```sql
SELECT 
    "clientId",
    "clientSecret",
    name,
    "redirectUris",
    "isActive"
FROM oauth_clients
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
```

### Способ 2: Через Adminer (веб-интерфейс)

1. Откройте http://45.144.176.42:8080
2. Войдите в базу данных:
   - **Система**: PostgreSQL
   - **Сервер**: `loginus-db`
   - **Пользователь**: `loginus_user`
   - **Пароль**: (из переменных окружения)
   - **База данных**: `loginus_dev`
3. Выполните SQL запрос:

```sql
SELECT 
    "clientId",
    "clientSecret",
    name,
    "redirectUris",
    "isActive"
FROM oauth_clients
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
```

### Способ 3: Через тестовый запрос к API

Попробуйте обменять authorization code на token с предоставленным client_secret:

```bash
curl -X POST https://loginus.startapus.com/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=VALID_AUTHORIZATION_CODE" \
  -d "redirect_uri=https://vselena.ldmco.ru/api/auth/callback" \
  -d "client_id=ad829ce93adefd15b0804e88e150062c" \
  -d "client_secret=399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254"
```

**Если запрос успешен (200 OK)** - client_secret правильный ✅  
**Если запрос возвращает 401 Unauthorized** - client_secret неверный ❌

## Важные вопросы для проверки

1. **Правильный ли client_secret?**
   - Сравните значение из базы данных с предоставленным: `399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254`

2. **Подходит ли он для домена vselena.ldmco.ru?**
   - Client Secret не привязан к домену напрямую
   - Важно, чтобы `redirect_uri` в запросе совпадал с одним из `redirectUris` в базе данных
   - Проверьте, что `https://vselena.ldmco.ru/api/auth/callback` присутствует в массиве `redirectUris`

3. **Нужен ли новый client_secret для нового домена?**
   - ❌ **НЕТ** - Client Secret один для всех redirect_uri клиента
   - ✅ **ДА** - Нужно добавить новый redirect_uri в массив `redirectUris` (если его там нет)

## Проверка Redirect URI

Убедитесь, что redirect_uri для vselena.ldmco.ru добавлен:

```sql
SELECT 
    "clientId",
    name,
    "redirectUris",
    CASE 
        WHEN 'https://vselena.ldmco.ru/api/auth/callback' = ANY("redirectUris") 
        THEN '✅ Redirect URI найден'
        ELSE '❌ Redirect URI не найден'
    END as redirect_uri_status
FROM oauth_clients
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
```

## Если Client Secret неверный

Если предоставленный client_secret не совпадает с тем, что в базе данных:

1. **Вариант 1**: Используйте правильный client_secret из базы данных
2. **Вариант 2**: Создайте новый OAuth клиент специально для vselena.ldmco.ru

### Создание нового клиента (если нужно)

```sql
INSERT INTO oauth_clients (
    id, 
    "clientId", 
    "clientSecret", 
    name, 
    "redirectUris", 
    scopes, 
    "isActive", 
    "createdAt", 
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'vselena-client-id-' || substr(md5(random()::text), 1, 32),
    encode(gen_random_bytes(32), 'hex'),
    'Vselena Service',
    ARRAY['https://vselena.ldmco.ru/api/auth/callback'],
    ARRAY['openid', 'email', 'profile', 'organizations', 'roles', 'permissions'],
    true,
    NOW(),
    NOW()
)
RETURNING "clientId", "clientSecret";
```

⚠️ **ВАЖНО**: Сохраните новый `clientId` и `clientSecret` сразу!

## Результат проверки

После проверки заполните:

- [ ] Client Secret из БД: `_____________________________`
- [ ] Совпадает с предоставленным: `ДА / НЕТ`
- [ ] Redirect URI для vselena.ldmco.ru присутствует: `ДА / НЕТ`
- [ ] Тестовый запрос к API успешен: `ДА / НЕТ`

---

**Дата проверки**: _______________  
**Проверил**: _______________

