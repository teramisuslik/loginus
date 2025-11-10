#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys

ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
server = "root@45.144.176.42"
base_path = r"c:\Users\teramisuslik\работа\loginusV2\loginus-backend"

files_to_upload = [
    ("src/auth/services/oauth.service.ts", "/root/loginus-backend/src/auth/services/oauth.service.ts"),
    ("src/auth/auth.module.ts", "/root/loginus-backend/src/auth/auth.module.ts"),
]

print("📤 Загружаю измененные файлы на сервер...")

for local_rel, remote_path in files_to_upload:
    local_path = f"{base_path}/{local_rel}"
    print(f"\n📄 {local_rel} -> {remote_path}")
    
    scp_cmd = [
        "scp",
        "-i", ssh_key,
        local_path,
        f"{server}:{remote_path}"
    ]
    
    result = subprocess.run(scp_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    
    if result.returncode == 0:
        print(f"✅ {local_rel} загружен")
    else:
        print(f"❌ Ошибка при загрузке {local_rel}: {result.stderr}")
        sys.exit(1)

print("\n🔄 Перезапускаю контейнер...")
restart_cmd = [
    "ssh",
    "-i", ssh_key,
    server,
    "docker restart loginus-backend"
]

result = subprocess.run(restart_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
if result.returncode == 0:
    print("✅ Контейнер перезапущен")
else:
    print(f"❌ Ошибка при перезапуске: {result.stderr}")
    sys.exit(1)

print("\n⏳ Жду 10 секунд для запуска...")
import time
time.sleep(10)

print("\n📋 Проверяю логи...")
logs_cmd = [
    "ssh",
    "-i", ssh_key,
    server,
    "docker logs loginus-backend --tail 50"
]

result = subprocess.run(logs_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
print(result.stdout)

if "error" in result.stdout.lower() or "Error" in result.stdout:
    print("\n⚠️ Обнаружены ошибки в логах!")
    sys.exit(1)
else:
    print("\n✅ Контейнер запущен успешно!")

print("\n🔍 Проверяю, что изменения применились...")
check_cmd = [
    "ssh",
    "-i", ssh_key,
    server,
    "docker exec loginus-backend grep -c 'OrganizationMembership' /app/src/auth/services/oauth.service.ts"
]

result = subprocess.run(check_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
if result.returncode == 0 and result.stdout.strip() != "0":
    print(f"✅ Изменения применены! Найдено упоминаний OrganizationMembership: {result.stdout.strip()}")
else:
    print("⚠️ Не удалось проверить изменения")

print("\n✅ Готово!")

