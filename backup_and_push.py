#!/usr/bin/env python3
import subprocess
import sys
import datetime

def run_cmd(cmd, description):
    """Выполняет команду и выводит результат"""
    print(f"\n{'='*60}")
    print(f"📋 {description}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr and result.returncode != 0:
        print(f"⚠️  Ошибка: {result.stderr}")
    return result.returncode == 0

def main():
    print("🚀 Начинаю процесс бэкапа и push в GitHub")
    
    # 1. Бэкап на сервере
    remote_host = "root@45.144.176.42"
    ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
    backup_date = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    print(f"\n📦 Создаю бэкап на сервере...")
    backup_cmd = f'ssh -i {ssh_key} {remote_host} "cd /opt/vselena_back && tar -czf /root/backup_{backup_date}.tar.gz frontend/index.html && ls -lh /root/backup_{backup_date}.tar.gz && echo Бэкап создан: /root/backup_{backup_date}.tar.gz"'
    
    if not run_cmd(backup_cmd, "Создание бэкапа на сервере"):
        print("⚠️  Предупреждение: не удалось создать бэкап, но продолжаю...")
    
    # 2. Проверка git статуса
    if not run_cmd("git status", "Проверка статуса git"):
        print("❌ Ошибка: репозиторий git не найден или не инициализирован")
        return False
    
    # 3. Добавление remote, если его нет
    remote_check = subprocess.run("git remote get-url origin", shell=True, capture_output=True, text=True)
    if remote_check.returncode != 0:
        print("\n📎 Настраиваю remote origin...")
        if not run_cmd("git remote add origin https://github.com/teramisuslik/loginus.git", "Добавление remote origin"):
            print("⚠️  Предупреждение: remote уже существует или ошибка")
    
    # 4. Добавление всех файлов
    if not run_cmd("git add .", "Добавление всех файлов"):
        print("❌ Ошибка при добавлении файлов")
        return False
    
    # 5. Проверка что есть что коммитить
    status_check = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
    if not status_check.stdout.strip():
        print("\n✅ Нет изменений для коммита")
        return True
    
    # 6. Коммит
    commit_msg = f"Update: backup and push changes - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    if not run_cmd(f'git commit -m "{commit_msg}"', "Создание коммита"):
        print("❌ Ошибка при создании коммита")
        return False
    
    # 7. Push (только push, НЕ pull!)
    print("\n📤 Отправляю изменения в GitHub (только push, без pull)...")
    if not run_cmd("git push -u origin master", "Push в GitHub"):
        # Пробуем main вместо master
        if not run_cmd("git push -u origin main", "Push в GitHub (main branch)"):
            print("❌ Ошибка при push. Попробуйте вручную: git push -u origin master или git push -u origin main")
            return False
    
    print("\n✅ Все операции завершены успешно!")
    print(f"📦 Бэкап на сервере: /root/backup_{backup_date}.tar.gz")
    print("🔗 Репозиторий: https://github.com/teramisuslik/loginus")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

