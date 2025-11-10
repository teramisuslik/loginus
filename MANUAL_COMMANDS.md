# Команды для получения OAuth credentials вручную

Выполните эти команды по очереди в вашем терминале (PowerShell или CMD):

## Шаг 1: Найти контейнер PostgreSQL

```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker ps --format '{{.Names}}' | grep postgres"
```

Или проще - найти ID контейнера:
```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker ps -q -f name=postgres"
```

## Шаг 2: Выполнить SQL

Сначала загрузите SQL файл на сервер:

```bash
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend\register_sv_erp_client.sql root@45.144.176.42:/tmp/register_client.sql
```

Затем выполните SQL:

```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i $(docker ps -q -f name=postgres | head -1) psql -U postgres -d loginus < /tmp/register_client.sql"
```

## Альтернативный способ: Выполнить SQL напрямую

Если предыдущий способ не работает, подключитесь к серверу и выполните SQL вручную:

```bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42
```

Затем на сервере:

```bash
docker exec -it $(docker ps -q -f name=postgres | head -1) psql -U postgres -d loginus
```

И в psql выполните SQL из файла `loginus-backend/register_sv_erp_client.sql`

