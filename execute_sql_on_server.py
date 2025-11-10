#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys

# SQL команды для добавления прав
sql_commands = """
INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000700', 'knowledge.categories.read', 'Просмотр категорий', 'knowledge.categories', 'read', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000701', 'knowledge.categories.create', 'Создание категорий', 'knowledge.categories', 'create', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000702', 'knowledge.categories.update', 'Редактирование категорий', 'knowledge.categories', 'update', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000703', 'knowledge.categories.delete', 'Удаление категорий', 'knowledge.categories', 'delete', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
"""

# SSH команда для выполнения SQL
ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
server = "root@45.144.176.42"

# Экранируем SQL для передачи через SSH
escaped_sql = sql_commands.replace('"', '\\"').replace("'", "'\"'\"'")

# Команда для выполнения SQL через docker exec
command = f'ssh -i {ssh_key} {server} "docker exec -i loginus-db psql -U loginus -d loginus_dev -c \\"{escaped_sql}\\""'

print("Выполняю SQL команды на сервере...")
print(f"Команда: {command[:100]}...")

try:
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
        encoding='utf-8'
    )
    
    print("\n=== STDOUT ===")
    print(result.stdout)
    
    if result.stderr:
        print("\n=== STDERR ===")
        print(result.stderr)
    
    print(f"\n=== Exit Code: {result.returncode} ===")
    
    if result.returncode == 0:
        print("\n✅ SQL команды успешно выполнены!")
    else:
        print("\n❌ Ошибка при выполнении SQL команд")
        sys.exit(1)
        
except Exception as e:
    print(f"\n❌ Ошибка: {e}")
    sys.exit(1)

