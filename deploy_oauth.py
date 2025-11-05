#!/usr/bin/env python3
"""
Скрипт для деплоя OAuth функционала на сервер
"""

import subprocess
import os
import sys

SSH_KEY = r"C:\Users\teramisuslik\.ssh\id_ed25519"
SERVER = "root@45.144.176.42"
PROJECT_DIR = "/root/loginus-backend"
BASE_DIR = "loginus-backend"

def run_command(cmd, check=True):
    """Выполняет команду и возвращает результат"""
    print(f"🔧 Выполняю: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"❌ Ошибка: {result.stderr}")
        sys.exit(1)
    return result

def copy_file(local_path, remote_path):
    """Копирует файл на сервер через scp"""
    print(f"📋 Копирую {local_path} -> {remote_path}")
    
    # Создаем директорию на сервере
    remote_dir = os.path.dirname(remote_path)
    run_command(f'ssh -i "{SSH_KEY}" {SERVER} "mkdir -p {remote_dir}"', check=False)
    
    # Копируем файл
    run_command(f'scp -i "{SSH_KEY}" "{local_path}" {SERVER}:{remote_path}')

def main():
    print("🚀 Начинаем деплой OAuth функционала...\n")
    
    # Копируем новые файлы
    print("📦 Копирую новые файлы...")
    copy_file(
        f"{BASE_DIR}/src/auth/entities/oauth-client.entity.ts",
        f"{PROJECT_DIR}/src/auth/entities/oauth-client.entity.ts"
    )
    copy_file(
        f"{BASE_DIR}/src/auth/entities/authorization-code.entity.ts",
        f"{PROJECT_DIR}/src/auth/entities/authorization-code.entity.ts"
    )
    copy_file(
        f"{BASE_DIR}/src/auth/services/oauth.service.ts",
        f"{PROJECT_DIR}/src/auth/services/oauth.service.ts"
    )
    copy_file(
        f"{BASE_DIR}/src/auth/controllers/oauth.controller.ts",
        f"{PROJECT_DIR}/src/auth/controllers/oauth.controller.ts"
    )
    copy_file(
        f"{BASE_DIR}/src/auth/dto/oauth-token.dto.ts",
        f"{PROJECT_DIR}/src/auth/dto/oauth-token.dto.ts"
    )
    copy_file(
        f"{BASE_DIR}/src/database/migrations/1761343000000-CreateOAuthTables.ts",
        f"{PROJECT_DIR}/src/database/migrations/1761343000000-CreateOAuthTables.ts"
    )
    
    # Копируем обновленные файлы
    print("\n📝 Копирую обновленные файлы...")
    copy_file(
        f"{BASE_DIR}/package.json",
        f"{PROJECT_DIR}/package.json"
    )
    copy_file(
        f"{BASE_DIR}/src/main.ts",
        f"{PROJECT_DIR}/src/main.ts"
    )
    copy_file(
        f"{BASE_DIR}/src/auth/auth.module.ts",
        f"{PROJECT_DIR}/src/auth/auth.module.ts"
    )
    
    print("\n✅ Файлы скопированы")
    
    # Устанавливаем зависимости
    print("\n📦 Устанавливаю зависимости...")
    run_command(f'ssh -i "{SSH_KEY}" {SERVER} "cd {PROJECT_DIR} && npm install cookie-parser @types/cookie-parser"')
    
    # Запускаем миграции
    print("\n🗄️ Запускаю миграции...")
    run_command(f'ssh -i "{SSH_KEY}" {SERVER} "cd {PROJECT_DIR} && npm run migration:run"')
    
    # Собираем проект
    print("\n🔨 Собираю проект...")
    run_command(f'ssh -i "{SSH_KEY}" {SERVER} "cd {PROJECT_DIR} && npm run build"')
    
    # Перезапускаем приложение
    print("\n🔄 Перезапускаю приложение...")
    run_command(
        f'ssh -i "{SSH_KEY}" {SERVER} "cd {PROJECT_DIR} && (pm2 restart loginus-backend 2>/dev/null || systemctl restart loginus-backend 2>/dev/null || docker-compose restart backend 2>/dev/null || echo \\"⚠️ Не удалось автоматически перезапустить. Перезапустите вручную.\\")"',
        check=False
    )
    
    print("\n✅ Деплой завершен!")
    print("📚 Проверьте Swagger документацию: http://45.144.176.42:3001/api/docs")

if __name__ == "__main__":
    main()

