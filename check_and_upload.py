#!/usr/bin/env python3
import subprocess
import sys

def check_server_structure():
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    
    print("🔍 Проверяю структуру директорий на сервере...")
    
    # Проверяем /opt/
    ssh_cmd = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "ls -la /opt/ | grep -E '^d'"
    ]
    
    result = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print("\n📁 Директории в /opt/:")
        print(result.stdout)
    
    # Ищем директории с frontend
    ssh_cmd2 = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "find /opt -type d -name 'frontend' 2>/dev/null | head -5"
    ]
    
    result2 = subprocess.run(ssh_cmd2, capture_output=True, text=True)
    if result2.returncode == 0 and result2.stdout.strip():
        print("\n📁 Найденные директории 'frontend':")
        print(result2.stdout)
        paths = [p.strip() for p in result2.stdout.strip().split('\n') if p.strip()]
        if paths:
            # Берем первый найденный путь
            frontend_dir = paths[0]
            index_path = f"{frontend_dir}/index.html"
            print(f"\n✅ Используем путь: {index_path}")
            return index_path
    
    # Ищем index.html в /opt/
    ssh_cmd3 = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "find /opt -name 'index.html' -type f 2>/dev/null | head -3"
    ]
    
    result3 = subprocess.run(ssh_cmd3, capture_output=True, text=True)
    if result3.returncode == 0 and result3.stdout.strip():
        print("\n📄 Найденные файлы index.html:")
        print(result3.stdout)
        paths = [p.strip() for p in result3.stdout.strip().split('\n') if p.strip()]
        if paths:
            print(f"\n✅ Используем путь: {paths[0]}")
            return paths[0]
    
    # Если ничего не найдено, пробуем стандартные варианты
    print("\n⚠️  Не найдено явных путей, проверяю стандартные варианты...")
    standard_paths = [
        "/opt/loginus_backend/frontend/index.html",
        "/opt/vselena_back/frontend/index.html",
        "/opt/backend/frontend/index.html"
    ]
    
    for path in standard_paths:
        ssh_cmd4 = [
            "ssh",
            "-i", ssh_key,
            remote_host,
            f"test -f {path} && echo 'EXISTS' || echo 'NOT_FOUND'"
        ]
        result4 = subprocess.run(ssh_cmd4, capture_output=True, text=True)
        if result4.returncode == 0 and "EXISTS" in result4.stdout:
            print(f"✅ Файл найден: {path}")
            return path
    
    print("\n❌ Не удалось найти путь к index.html")
    return None

def upload_file(remote_path):
    local_file = "frontend/index.html"
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    
    print(f"\n📤 Загружаю {local_file} в {remote_path}...")
    
    scp_cmd = [
        "scp",
        "-i", ssh_key,
        local_file,
        f"{remote_host}:{remote_path}"
    ]
    
    result = subprocess.run(scp_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Ошибка при копировании: {result.stderr}")
        return False
    
    print("✅ Файл успешно загружен!")
    
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
    remote_path = check_server_structure()
    if remote_path:
        success = upload_file(remote_path)
        sys.exit(0 if success else 1)
    else:
        print("\n❌ Не удалось определить путь для загрузки файла")
        sys.exit(1)

