#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys

ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
server = "root@45.144.176.42"

sql = """INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000700', 'knowledge.categories.read', 'Просмотр категорий', 'knowledge.categories', 'read', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000701', 'knowledge.categories.create', 'Создание категорий', 'knowledge.categories', 'create', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000702', 'knowledge.categories.update', 'Редактирование категорий', 'knowledge.categories', 'update', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000703', 'knowledge.categories.delete', 'Удаление категорий', 'knowledge.categories', 'delete', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;"""

print("Передаю SQL через stdin...")

# Используем ssh с передачей через stdin
ssh_cmd = [
    'ssh',
    '-i', ssh_key,
    server,
    'docker exec -i loginus-db psql -U loginus -d loginus_dev'
]

try:
    process = subprocess.Popen(
        ssh_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8'
    )
    
    stdout, stderr = process.communicate(input=sql)
    
    print("STDOUT:", stdout)
    if stderr:
        print("STDERR:", stderr)
    print("Exit code:", process.returncode)
    
    if process.returncode == 0:
        print("\n✅ SQL успешно выполнен!")
        
        # Проверяем результат
        check_cmd = [
            'ssh',
            '-i', ssh_key,
            server,
            'docker exec -i loginus-db psql -U loginus -d loginus_dev -c "SELECT name, resource, action FROM permissions WHERE name LIKE \'knowledge.categories%\';"'
        ]
        
        check_result = subprocess.run(check_cmd, capture_output=True, text=True, encoding='utf-8')
        print("\nПроверка добавленных прав:")
        print(check_result.stdout)
        
    else:
        print("\n❌ Ошибка при выполнении SQL")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

