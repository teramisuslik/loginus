#!/usr/bin/env python3
import sys
import subprocess

# Читаем файл
with open('loginus-backend/src/rbac/rbac.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Кодируем в base64 для безопасной передачи
import base64
encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')

# Отправляем на сервер
cmd = f'ssh -i C:\\Users\\teramisuslik\\.ssh\\id_ed25519 root@45.144.176.42 "cd /opt/vselena_back && echo \'{encoded}\' | base64 -d > src/rbac/rbac.service.ts && echo File copied"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print(result.stderr, file=sys.stderr)

