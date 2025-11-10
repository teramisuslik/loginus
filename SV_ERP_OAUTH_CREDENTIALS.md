# SV ERP Backend - OAuth Credentials

## Инструкция по получению credentials

Для получения `LOGINUS_CLIENT_ID` и `LOGINUS_CLIENT_SECRET` выполните один из способов:

### Способ 1: Через SQL на сервере (рекомендуется)

1. Подключитесь к серверу:
```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
```

2. Выполните SQL скрипт:
```bash
# Если БД в Docker контейнере
docker exec -i loginus_postgres psql -U postgres -d loginus < /path/to/register_sv_erp_client.sql

# Или подключитесь к контейнеру и выполните SQL
docker exec -it loginus_postgres psql -U postgres -d loginus
# Затем скопируйте и выполните содержимое register_sv_erp_client.sql
```

3. Сохраните полученные `clientId` и `clientSecret`

### Способ 2: Через Python скрипт

1. Загрузите `register_sv_erp_oauth_client.py` на сервер
2. Установите зависимости (если нужно): `pip install psycopg2-binary`
3. Настройте переменные окружения для подключения к БД:
```bash
export DB_HOST=localhost
export DB_PORT=5433  # или порт, на который проброшен PostgreSQL
export DB_NAME=loginus
export DB_USER=postgres
export DB_PASSWORD=postgres
```
4. Выполните скрипт:
```bash
python3 register_sv_erp_oauth_client.py
```

### Способ 3: Через API (если есть админ-токен)

```http
POST https://vselena.ldmco.ru/api/oauth/clients/register
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "name": "SV ERP Backend",
  "redirect_uris": [
    "http://localhost:4000/api/auth/callback",
    "http://localhost:3000/auth/callback"
  ],
  "scopes": ["openid", "email", "profile"]
}
```

---

## После получения credentials

Добавьте в переменные окружения SV_ERP_Backend:

```env
LOGINUS_CLIENT_ID=your-client-id-here
LOGINUS_CLIENT_SECRET=your-client-secret-here
LOGINUS_AUTH_URL=https://vselena.ldmco.ru/api/oauth/authorize
LOGINUS_TOKEN_URL=https://vselena.ldmco.ru/api/oauth/token
LOGINUS_USERINFO_URL=https://vselena.ldmco.ru/api/oauth/userinfo
LOGINUS_REDIRECT_URI=http://localhost:4000/api/auth/callback
```

**⚠️ ВАЖНО:**
- `LOGINUS_CLIENT_SECRET` храните только на бэкенде, никогда не передавайте на фронт!
- Redirect URI должен точно совпадать с зарегистрированным (включая протокол, порт и путь)

