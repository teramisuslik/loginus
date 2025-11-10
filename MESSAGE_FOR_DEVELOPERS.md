# Сообщение для разработчиков Loginus

## ✅ Redirect URI добавлен

После настройки SSL для домена `vselena.ldmco.ru` был добавлен Redirect URI для OAuth клиента.

### Информация о клиенте:
- **Client ID**: `ad829ce93adefd15b0804e88e150062c`
- **Название**: Vselena Service
- **Redirect URI**: `https://vselena.ldmco.ru/api/auth/callback`

### Статус:
✅ Redirect URI успешно добавлен в базу данных  
✅ OAuth flow настроен и работает  
✅ Frontend корректно обрабатывает OAuth flow после авторизации

### Проверка:
Redirect URI можно проверить в таблице `oauth_clients` базы данных `loginus_dev`:

```sql
SELECT "clientId", name, "redirectUris", "isActive" 
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
```

### Результат:
```
clientId: ad829ce93adefd15b0804e88e150062c
name: Vselena Service
redirectUris: {https://vselena.ldmco.ru/api/auth/callback}
isActive: true
```

---

**Дата**: 10 ноября 2025  
**Статус**: ✅ Выполнено

