# Настройка OAuth Redirect URI для Vselena Service

## ✅ Статус: Выполнено

Redirect URI для OAuth клиента **Vselena Service** успешно добавлен в базу данных.

## Информация о клиенте

- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Название**: Vselena Service
- **Redirect URI**: `https://vselena.ldmco.ru/api/auth/callback`
- **Статус**: Активен

## Проверка в базе данных

Redirect URI был добавлен в таблицу `oauth_clients` в базе данных `loginus_dev`.

## Проверка работы

Для проверки работы OAuth flow:

1. Перейдите на `https://vselena.ldmco.ru/`
2. Нажмите "Войти"
3. Вас перенаправит на `https://loginus.startapus.com/oauth/authorize?client_id=ad829ce93adefd15b0804e88e150062c&redirect_uri=https://vselena.ldmco.ru/api/auth/callback&response_type=code&scope=openid+email+profile+organizations+roles+permissions&state=...`
4. После авторизации вы будете перенаправлены обратно на `https://vselena.ldmco.ru/api/auth/callback?code=...&state=...`

## Технические детали

- **База данных**: PostgreSQL (`loginus_dev`)
- **Таблица**: `oauth_clients`
- **Поле**: `redirectUris` (массив строк)
- **Валидация**: Backend проверяет, что `redirect_uri` из запроса присутствует в списке разрешенных URI для клиента

## Дата выполнения

10 ноября 2025

## Примечание

После настройки SSL на домене `vselena.ldmco.ru` убедитесь, что:
- ✅ Redirect URI добавлен в базу данных (выполнено)
- ✅ OAuth flow работает корректно (проверено)
- ✅ Frontend правильно обрабатывает OAuth flow после авторизации (исправлено)

