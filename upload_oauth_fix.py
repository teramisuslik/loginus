#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys
import os

ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
server = "root@45.144.176.42"
backend_path = r"c:\Users\teramisuslik\работа\loginusV2\loginus-backend"
frontend_path = r"c:\Users\teramisuslik\работа\loginusV2\frontend"

files_to_upload = [
    ("src/auth/controllers/oauth.controller.ts", "/opt/vselena_back/src/auth/controllers/oauth.controller.ts"),
    ("../frontend/index.html", "/opt/vselena_back/../frontend/index.html"),
]

print("📤 Загружаю исправления OAuth на сервер...")

for local_rel, remote_path in files_to_upload:
    if local_rel.startswith("../"):
        local_path = os.path.join(frontend_path, local_rel.replace("../frontend/", ""))
    else:
        local_path = os.path.join(backend_path, local_rel)
    
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

print("\n🔄 Перезапускаю контейнеры...")
restart_backend = [
    "ssh",
    "-i", ssh_key,
    server,
    "cd /opt/vselena_back && docker-compose restart backend"
]

result = subprocess.run(restart_backend, capture_output=True, text=True, encoding='utf-8', errors='ignore')
if result.returncode == 0:
    print("✅ Backend контейнер перезапущен")
else:
    print(f"❌ Ошибка при перезапуске backend: {result.stderr}")

print("\n⏳ Жду 5 секунд для запуска...")
import time
time.sleep(5)

print("\n📋 Проверяю логи backend...")
logs_cmd = [
    "ssh",
    "-i", ssh_key,
    server,
    "cd /opt/vselena_back && docker-compose logs backend --tail 30"
]

result = subprocess.run(logs_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
print(result.stdout)

print("\n✅ Готово! Теперь проверьте редирект через браузер.")

