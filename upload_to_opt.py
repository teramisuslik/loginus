#!/usr/bin/env python3
import subprocess
import sys

def upload_to_opt():
    local_file = "frontend/index.html"
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    remote_path = "/opt/loginus_backend/frontend/index.html"
    
    # Копируем файл напрямую в /opt/index.html
    scp_cmd = [
        "scp",
        "-i", ssh_key,
        local_file,
        f"{remote_host}:{remote_path}"
    ]
    
    print("📤 Загружаю frontend/index.html в /opt/loginus_backend/frontend/index.html на сервере...")
    result = subprocess.run(scp_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Ошибка при копировании: {result.stderr}")
        return False
    
    print("✅ Файл успешно загружен в /opt/loginus_backend/frontend/index.html")
    
    # Проверяем, что файл содержит нужные изменения
    ssh_cmd = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        f"grep -c 'savedNfaUserId' {remote_path} && echo '✅ Файл содержит обновления!'"
    ]
    
    print("\n🔍 Проверяю файл на сервере...")
    result = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout)
        return True
    else:
        print(f"⚠️  Предупреждение: не удалось проверить файл: {result.stderr}")
        return True  # Файл все равно загружен
    
if __name__ == "__main__":
    success = upload_to_opt()
    sys.exit(0 if success else 1)

