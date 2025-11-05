#!/usr/bin/env python3
import subprocess
import sys

def find_path_and_upload():
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    
    print("🔍 Ищу frontend/index.html на сервере...")
    
    # Ищем файлы index.html в frontend
    ssh_cmd = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "find /opt -name 'index.html' -path '*/frontend/*' 2>/dev/null"
    ]
    
    result = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        paths = [p.strip() for p in result.stdout.strip().split('\n') if p.strip()]
        print(f"\n📁 Найдено {len(paths)} файл(ов) index.html:")
        for i, path in enumerate(paths, 1):
            print(f"  {i}. {path}")
        
        # Используем первый найденный путь
        remote_path = paths[0]
        print(f"\n✅ Использую путь: {remote_path}")
        
        # Проверяем размер файла
        size_cmd = [
            "ssh",
            "-i", ssh_key,
            remote_host,
            f"ls -lh '{remote_path}'"
        ]
        size_result = subprocess.run(size_cmd, capture_output=True, text=True)
        if size_result.returncode == 0:
            print(f"Текущий размер: {size_result.stdout.strip()}")
        
    else:
        # Если не нашли, пробуем стандартные пути
        possible_paths = [
            "/opt/loginus_backend/frontend/index.html",
            "/opt/vselena_back/frontend/index.html",
            "/opt/loginus/frontend/index.html"
        ]
        
        print("\n⚠️  Файл не найден автоматически. Проверяю стандартные пути...")
        remote_path = None
        
        for path in possible_paths:
            check_cmd = [
                "ssh",
                "-i", ssh_key,
                remote_host,
                f"test -f '{path}' && echo 'exists' || echo 'not found'"
            ]
            check_result = subprocess.run(check_cmd, capture_output=True, text=True)
            if check_result.stdout.strip() == "exists":
                print(f"✅ Найден: {path}")
                remote_path = path
                break
        
        if not remote_path:
            # Проверяем, какие директории есть в /opt/
            list_cmd = [
                "ssh",
                "-i", ssh_key,
                remote_host,
                "ls -d /opt/*/frontend 2>/dev/null"
            ]
            list_result = subprocess.run(list_cmd, capture_output=True, text=True)
            if list_result.stdout.strip():
                dirs = [d.strip() for d in list_result.stdout.strip().split('\n') if d.strip()]
                print(f"\n📁 Найдены директории frontend:")
                for d in dirs:
                    print(f"  - {d}")
                if dirs:
                    remote_path = f"{dirs[0]}/index.html"
                    print(f"\n✅ Использую путь: {remote_path}")
            
            if not remote_path:
                print("\n❌ Не удалось определить путь. Пожалуйста, укажите путь вручную.")
                print("Выполните команду:")
                print(f"scp -i {ssh_key} frontend/index.html {remote_host}:/путь/к/файлу/index.html")
                return False
    
    # Загружаем файл
    local_file = "frontend/index.html"
    scp_cmd = [
        "scp",
        "-i", ssh_key,
        local_file,
        f"{remote_host}:{remote_path}"
    ]
    
    print(f"\n📤 Загружаю {local_file} в {remote_path}...")
    result = subprocess.run(scp_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Ошибка при копировании: {result.stderr}")
        return False
    
    print("✅ Файл успешно загружен!")
    
    # Проверяем файл
    ssh_cmd_check = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        f"grep -c 'savedNfaUserId' '{remote_path}' && echo '✅ Файл содержит обновления!'"
    ]
    
    print("\n🔍 Проверяю загруженный файл...")
    check_result = subprocess.run(ssh_cmd_check, capture_output=True, text=True)
    if check_result.returncode == 0:
        print(check_result.stdout)
    else:
        print(f"⚠️  Предупреждение: {check_result.stderr}")
    
    return True

if __name__ == "__main__":
    success = find_path_and_upload()
    sys.exit(0 if success else 1)

