@echo off
chcp 65001 >nul
echo Выполняю SQL команды на сервере...

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i loginus-db psql -U loginus -d loginus_dev -c \"INSERT INTO permissions (id, name, description, resource, action, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('00000000-0000-0000-0000-000000000700', 'knowledge.categories.read', 'Просмотр категорий', 'knowledge.categories', 'read', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;\""

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i loginus-db psql -U loginus -d loginus_dev -c \"INSERT INTO permissions (id, name, description, resource, action, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('00000000-0000-0000-0000-000000000701', 'knowledge.categories.create', 'Создание категорий', 'knowledge.categories', 'create', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;\""

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i loginus-db psql -U loginus -d loginus_dev -c \"INSERT INTO permissions (id, name, description, resource, action, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('00000000-0000-0000-0000-000000000702', 'knowledge.categories.update', 'Редактирование категорий', 'knowledge.categories', 'update', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;\""

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i loginus-db psql -U loginus -d loginus_dev -c \"INSERT INTO permissions (id, name, description, resource, action, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('00000000-0000-0000-0000-000000000703', 'knowledge.categories.delete', 'Удаление категорий', 'knowledge.categories', 'delete', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;\""

echo.
echo Проверяю добавленные права...
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "docker exec -i loginus-db psql -U loginus -d loginus_dev -c \"SELECT name, resource, action FROM permissions WHERE name LIKE 'knowledge.categories%';\""

echo.
echo Готово!

