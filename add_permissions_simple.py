#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import os

ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
server = "root@45.144.176.42"

# SQL команды (по одной, без кириллицы в описаниях для упрощения)
sql_commands = [
    "INSERT INTO permissions (id, name, description, resource, action, \"createdAt\", \"updatedAt\") VALUES ('00000000-0000-0000-0000-000000000700', 'knowledge.categories.read', 'View categories', 'knowledge.categories', 'read', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;",
    "INSERT INTO permissions (id, name, description, resource, action, \"createdAt\", \"updatedAt\") VALUES ('00000000-0000-0000-0000-000000000701', 'knowledge.categories.create', 'Create categories', 'knowledge.categories', 'create', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;",
    "INSERT INTO permissions (id, name, description, resource, action, \"createdAt\", \"updatedAt\") VALUES ('00000000-0000-0000-0000-000000000702', 'knowledge.categories.update', 'Update categories', 'knowledge.categories', 'update', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;",
    "INSERT INTO permissions (id, name, description, resource, action, \"createdAt\", \"updatedAt\") VALUES ('00000000-0000-0000-0000-000000000703', 'knowledge.categories.delete', 'Delete categories', 'knowledge.categories', 'delete', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;",
]

print("Выполняю SQL команды на сервере...")

for i, sql in enumerate(sql_commands, 1):
    print(f"\n[{i}/4] Выполняю команду...")
    
    # Простая команда без сложного экранирования
    cmd = [
        'ssh',
        '-i', ssh_key,
        server,
        f'docker exec -i loginus-db psql -U loginus -d loginus_dev -c "{sql}"'
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        
        if result.stdout:
            print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        print(f"Exit code: {result.returncode}")
        
        if result.returncode == 0:
            print(f"✅ Команда {i} выполнена успешно")
        else:
            print(f"⚠️ Команда {i} завершилась с кодом {result.returncode}")
            
    except Exception as e:
        print(f"❌ Ошибка при выполнении команды {i}: {e}")

print("\n✅ Все команды выполнены!")

