#!/usr/bin/env python3
"""
Скрипт для регистрации OAuth клиента на сервере
Выполняет SQL через SSH подключение к Docker контейнеру
"""

import subprocess
import sys

# Параметры сервера
SSH_KEY = r"C:\Users\teramisuslik\.ssh\id_ed25519"
SSH_HOST = "root@45.144.176.42"

# SQL скрипт
SQL_SCRIPT = """
-- Регистрация OAuth клиента для SV_ERP_Backend
INSERT INTO oauth_clients (id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  encode(gen_random_bytes(16), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  'SV ERP Backend',
  ARRAY[
    'http://localhost:4000/api/auth/callback',
    'http://localhost:3000/auth/callback'
  ],
  ARRAY['openid', 'email', 'profile'],
  true,
  NOW(),
  NOW()
)
RETURNING "clientId", "clientSecret", name, "redirectUris", scopes;
"""

def execute_sql_on_server():
    """Выполняет SQL на сервере через SSH и Docker"""
    
    # Команда для выполнения SQL в Docker контейнере
    docker_cmd = f'docker exec -i $(docker ps -q -f "name=postgres" | head -1) psql -U postgres -d loginus -t -A -F"," -c "{SQL_SCRIPT.replace(chr(10), " ").replace(chr(13), " ").replace('"', '\\"')}"'
    
    # Или проще - через файл
    print("📤 Загружаю SQL скрипт на сервер...")
    
    # Сначала загрузим SQL файл на сервер
    scp_cmd = [
        'scp',
        '-i', SSH_KEY,
        'loginus-backend/register_sv_erp_client.sql',
        f'{SSH_HOST}:/tmp/register_sv_erp_client.sql'
    ]
    
    try:
        result = subprocess.run(scp_cmd, capture_output=True, text=True, check=True)
        print("✅ SQL файл загружен на сервер")
    except subprocess.CalledProcessError as e:
        print(f"❌ Ошибка при загрузке файла: {e.stderr}")
        return False
    
    # Теперь выполним SQL на сервере
    print("🔧 Выполняю SQL на сервере...")
    
    ssh_cmd = [
        'ssh',
        '-i', SSH_KEY,
        SSH_HOST,
        'bash -c "docker exec -i $(docker ps -q -f \\"name=postgres\\" | head -1) psql -U postgres -d loginus < /tmp/register_sv_erp_client.sql"'
    ]
    
    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, check=True)
        print("✅ SQL выполнен успешно")
        print("\n" + "="*60)
        print("Результат:")
        print("="*60)
        print(result.stdout)
        print("="*60)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Ошибка при выполнении SQL: {e.stderr}")
        print(f"Вывод: {e.stdout}")
        return False

if __name__ == '__main__':
    print("🚀 Регистрация OAuth клиента для SV_ERP_Backend")
    print("="*60)
    success = execute_sql_on_server()
    if success:
        print("\n✅ Готово! Проверьте вывод выше для получения credentials.")
        print("\n💡 Или выполните на сервере вручную:")
        print("   ssh -i C:\\Users\\teramisuslik\\.ssh\\id_ed25519 root@45.144.176.42")
        print("   docker exec -it <postgres_container> psql -U postgres -d loginus")
        print("   # Затем скопируйте и выполните содержимое register_sv_erp_client.sql")
    else:
        print("\n❌ Не удалось выполнить регистрацию автоматически.")
        print("   Выполните SQL вручную на сервере.")
        sys.exit(1)

