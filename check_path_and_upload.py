#!/usr/bin/env python3
import subprocess
import sys

def check_path_and_upload():
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    
    print("🔍 Проверяю структуру директорий в /opt/...")
    
    # Проверяем структуру /opt/
    ssh_cmd = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "ls -la /opt/ | head -20"
    ]
    
    result = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout)
    else:
        print(f"❌ Ошибка при проверке /opt/: {result.stderr}")
        return False
    
    print("\n🔍 Ищу директории с loginus...")
    ssh_cmd2 = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "find /opt -maxdepth 2 -type d -iname '*loginus*' 2>/dev/null"
    ]
    
    result2 = subprocess.run(ssh_cmd2, capture_output=True, text=True)
    if result2.returncode == 0:
        print(result2.stdout)
        if result2.stdout.strip():
            paths = result2.stdout.strip().split('\n')
            print(f"\n📁 Найдено директорий: {len(paths)}")
            for path in paths:
                if path.strip():
                    print(f"  - {path.strip()}")
    else:
        print(f"⚠️  Не найдено директорий с loginus: {result2.stderr}")
    
    print("\n🔍 Ищу frontend/index.html...")
    ssh_cmd3 = [
        "ssh",
        "-i", ssh_key,
        remote_host,
        "find /opt -name 'index.html' -path '*/frontend/*' 2>/dev/null"
    ]
    
    result3 = subprocess.run(ssh_cmd3, capture_output=True, text=True)
    if result3.returncode == 0:
        if result3.stdout.strip():
            print("Найдены файлы index.html в frontend:")
            for path in result3.stdout.strip().split('\n'):
                if path.strip():
                    print(f"  - {path.strip()}")
                    # Проверяем размер файла
                    size_cmd = [
                        "ssh",
                        "-i", ssh_key,
                        remote_host,
                        f"ls -lh '{path.strip()}'"
                    ]
                    size_result = subprocess.run(size_cmd, capture_output=True, text=True)
                    if size_result.returncode == 0:
                        print(f"    {size_result.stdout.strip()}")
        else:
            print("⚠️  Файлы index.html в frontend не найдены")
    else:
        print(f"⚠️  Ошибка поиска: {result3.stderr}")
    
    # Спрашиваем пользователя, куда загружать
    print("\n📤 Куда загружать файл?")
    print("Если найден путь выше, используйте его. Иначе введите путь вручную.")
    print("Пример: /opt/loginus_backend/frontend/index.html")
    
    remote_path = input("Введите путь (или Enter для использования найденного): ").strip()
    
    if not remote_path:
        # Используем первый найденный путь
        if result3.stdout.strip():
            paths = result3.stdout.strip().split('\n')
            remote_path = paths[0].strip()
            print(f"Использую найденный путь: {remote_path}")
        else:
            print("❌ Не указан путь для загрузки")
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
    success = check_path_and_upload()
    sys.exit(0 if success else 1)

