#!/usr/bin/env python3
"""
Скрипт для создания OAuth клиента для SV_ERP_Backend
Выполняет SQL на сервере через SSH
"""

import subprocess
import sys
import os

SSH_KEY = r"C:\Users\teramisuslik\.ssh\id_ed25519"
SSH_HOST = "root@45.144.176.42"

# SQL для создания клиента
SQL = """
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

def find_postgres_container():
    """Находит имя контейнера PostgreSQL"""
    cmd = ['ssh', '-i', SSH_KEY, SSH_HOST, 'docker ps --format "{{.Names}}" | grep -i postgres']
    try:
        result = subprocess.run(cmd, shell=False, capture_output=True, text=True, check=True)
        containers = result.stdout.strip().split('\n')
        if containers and containers[0]:
            return containers[0].strip()
        return None
    except subprocess.CalledProcessError:
        return None

def execute_sql(sql_command):
    """Выполняет SQL команду на сервере"""
    # Сначала найдем контейнер
    print("🔍 Ищу контейнер PostgreSQL...")
    container = find_postgres_container()
    
    if not container:
        # Попробуем найти по другому паттерну
        cmd = ['ssh', '-i', SSH_KEY, SSH_HOST, 'docker ps -q -f "name=postgres"']
        try:
            result = subprocess.run(cmd, shell=False, capture_output=True, text=True, check=True)
            container_id = result.stdout.strip().split('\n')[0]
            if container_id:
                container = container_id
        except:
            pass
    
    if not container:
        print("❌ Не найден контейнер PostgreSQL")
        print("Попробую выполнить SQL напрямую...")
        # Попробуем выполнить через docker exec без указания имени
        container = "$(docker ps -q -f 'name=postgres' | head -1)"
    
    print(f"📦 Использую контейнер: {container}")
    
    # Создаем временный SQL файл на сервере
    print("📤 Загружаю SQL на сервер...")
    
    # Сначала создадим SQL файл локально
    with open('temp_register_client.sql', 'w', encoding='utf-8') as f:
        f.write(SQL)
    
    # Загрузим на сервер
    scp_cmd = ['scp', '-i', SSH_KEY, 'temp_register_client.sql', f'{SSH_HOST}:/tmp/register_client.sql']
    try:
        subprocess.run(scp_cmd, check=True, capture_output=True)
        print("✅ SQL файл загружен")
    except subprocess.CalledProcessError as e:
        print(f"❌ Ошибка загрузки: {e.stderr.decode() if e.stderr else 'unknown'}")
        return None
    
    # Выполним SQL
    print("🔧 Выполняю SQL...")
    
    # Команда для выполнения SQL в контейнере
    if container.startswith('$'):
        # Если это bash команда
        ssh_cmd = ['ssh', '-i', SSH_KEY, SSH_HOST, 
                   f'docker exec -i $(docker ps -q -f "name=postgres" | head -1) psql -U postgres -d loginus -t -A -F"," < /tmp/register_client.sql']
    else:
        ssh_cmd = ['ssh', '-i', SSH_KEY, SSH_HOST,
                   f'docker exec -i {container} psql -U postgres -d loginus -t -A -F"," < /tmp/register_client.sql']
    
    try:
        # Выполняем через bash
        full_cmd = f'docker exec -i $(docker ps -q -f "name=postgres" | head -1) psql -U postgres -d loginus < /tmp/register_client.sql'
        result = subprocess.run(
            ['ssh', '-i', SSH_KEY, SSH_HOST, full_cmd],
            capture_output=True,
            text=True,
            check=True
        )
        
        output = result.stdout.strip()
        print("✅ SQL выполнен успешно")
        print("\n" + "="*70)
        print("РЕЗУЛЬТАТ:")
        print("="*70)
        print(output)
        print("="*70)
        
        # Парсим результат (формат: clientId,clientSecret,name,redirectUris,scopes)
        if output:
            parts = output.split(',')
            if len(parts) >= 2:
                client_id = parts[0].strip()
                client_secret = parts[1].strip()
                
                print("\n" + "="*70)
                print("✅ OAUTH CREDENTIALS:")
                print("="*70)
                print(f"\nLOGINUS_CLIENT_ID={client_id}")
                print(f"\nLOGINUS_CLIENT_SECRET={client_secret}")
                print("\n" + "="*70)
                print("⚠️  ВАЖНО: Сохраните CLIENT_SECRET сразу!")
                print("="*70 + "\n")
                
                # Сохраняем в файл
                with open('sv_erp_credentials.txt', 'w') as f:
                    f.write(f"LOGINUS_CLIENT_ID={client_id}\n")
                    f.write(f"LOGINUS_CLIENT_SECRET={client_secret}\n")
                    f.write(f"\nRedirect URIs:\n")
                    f.write(f"  - http://localhost:4000/api/auth/callback\n")
                    f.write(f"  - http://localhost:3000/auth/callback\n")
                
                print("💾 Credentials сохранены в: sv_erp_credentials.txt\n")
                
                return {
                    'client_id': client_id,
                    'client_secret': client_secret
                }
        
        return None
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Ошибка выполнения SQL: {e.stderr if e.stderr else 'unknown'}")
        print(f"Вывод: {e.stdout if e.stdout else 'none'}")
        return None
    finally:
        # Удаляем временный файл
        try:
            os.remove('temp_register_client.sql')
        except:
            pass

if __name__ == '__main__':
    print("🚀 Создание OAuth клиента для SV_ERP_Backend")
    print("="*70)
    result = execute_sql(SQL)
    
    if result:
        print("\n✅ Готово! Используйте credentials выше.")
    else:
        print("\n❌ Не удалось создать клиента автоматически.")
        print("\nВыполните вручную на сервере:")
        print(f"  ssh -i {SSH_KEY} {SSH_HOST}")
        print("  docker exec -it <postgres_container> psql -U postgres -d loginus")
        print("  # Затем выполните SQL из register_sv_erp_client.sql")
        sys.exit(1)

