# Поиск правильной базы данных

## Проблема
Пользователи не могут войти со старыми данными. Возможно, обновлена не та версия проекта.

## Найденные директории и конфигурации:

### 1. `/opt/vselena_back` (текущая активная)
- Контейнеры: `loginus-backend`, `loginus-db`
- База данных: `loginus_dev`
- Пользователь БД: `loginus`
- Пароль БД: `loginus_secret`
- Volume: `vselena_back_postgres_data`
- Пользователей в БД: 8
- FRONTEND_URL: `https://loginus.startapus.com` (обновлен)

### 2. `/opt/vselena-working/backend`
- Контейнеры: `vselena-backend`, `vselena-db` (не запущены)
- База данных: `vselena_dev`
- Пользователь БД: `vselena`
- Пароль БД: `vselena_secret`
- Volume: `vselena-backend_postgres_data` или `backend_postgres_data`
- FRONTEND_URL: `https://vselena.ldmco.ru` (старый)

### 3. `/opt/vselena-working`
- Контейнеры: не запущены
- База данных: `vselena_dev`
- FRONTEND_URL: `https://vselena.ldmco.ru` (старый)

## Вопросы для уточнения:

1. **Какая директория использовалась для продакшена раньше?**
   - `/opt/vselena_back`?
   - `/opt/vselena-working/backend`?
   - `/opt/vselena-working`?

2. **Где находятся реальные пользователи с рабочими паролями?**
   - В базе `loginus_dev` (текущая активная)?
   - В базе `vselena_dev` (в volume `vselena-backend_postgres_data`)?

3. **Какой контейнер backend использовался раньше?**
   - `loginus-backend`?
   - `vselena-backend`?

## Следующие шаги:

После уточнения нужно:
1. Определить правильную директорию и базу данных
2. Обновить домен в правильном docker-compose.yml
3. Перезапустить правильные контейнеры
4. Проверить, что пользователи могут войти

