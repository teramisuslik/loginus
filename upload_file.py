#!/usr/bin/env python3
import subprocess
import sys

def upload_file():
    local_file = "frontend/index.html"
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    
    # Сначала копируем на сервер
    scp_cmd = [
        "scp",
        "-i", ssh_key,
        local_file,
        f"{remote_host}:/tmp/index.html"
    ]
    
    print("Копирую файл на сервер...")
    result = subprocess.run(scp_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Ошибка при копировании: {result.stderr}")
        return False
    
    # Затем копируем в контейнер
    ssh_cmd = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "docker cp /tmp/index.html loginus-backend:/app/frontend/index.html && rm /tmp/index.html && echo 'File uploaded successfully'"
    ]
    
    print("Копирую файл в контейнер...")
    result = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Ошибка при копировании в контейнер: {result.stderr}")
        return False
    
    print("Файл успешно загружен!")
    print(result.stdout)
    return True

if __name__ == "__main__":
    success = upload_file()
    sys.exit(0 if success else 1)

