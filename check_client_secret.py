#!/usr/bin/env python3
"""
Скрипт для проверки client_secret OAuth клиента
"""
import subprocess
import sys

# Параметры подключения
SSH_KEY = r"C:\Users\teramisuslik\.ssh\id_ed25519"
SERVER = "root@45.144.176.42"
CLIENT_ID = "ad829ce93adefd15b0804e88e150062c"
PROVIDED_SECRET = "399076453b1b9a3ac2aafe4d8957a66d01a26ace9397d520b92fbdb70291e254"

# SQL запрос
SQL_QUERY = f"""
SELECT 
    "clientId",
    "clientSecret",
    name,
    "redirectUris",
    "isActive"
FROM oauth_clients
WHERE "clientId" = '{CLIENT_ID}';
"""

# Команда для выполнения через SSH
ssh_command = f"""
cd /opt/vselena_back && docker exec loginus-db psql -U loginus_user -d loginus_dev -c "{SQL_QUERY}"
"""

# Выполняем команду
try:
    result = subprocess.run(
        ["ssh", "-i", SSH_KEY, SERVER, ssh_command],
        capture_output=True,
        text=True,
        check=True
    )
    
    print("=" * 80)
    print("РЕЗУЛЬТАТ ПРОВЕРКИ CLIENT_SECRET")
    print("=" * 80)
    print()
    print(result.stdout)
    print()
    
    # Проверяем, совпадает ли client_secret
    if PROVIDED_SECRET in result.stdout:
        print("✅ ПРЕДОСТАВЛЕННЫЙ CLIENT_SECRET СОВПАДАЕТ С БАЗОЙ ДАННЫХ!")
    else:
        print("❌ ПРЕДОСТАВЛЕННЫЙ CLIENT_SECRET НЕ СОВПАДАЕТ С БАЗОЙ ДАННЫХ!")
        print(f"   Предоставленный: {PROVIDED_SECRET}")
        print("   Проверьте вывод выше для правильного client_secret из БД")
    
    # Проверяем redirect_uri
    if "vselena.ldmco.ru" in result.stdout:
        print("✅ Redirect URI для vselena.ldmco.ru найден в списке разрешенных")
    else:
        print("❌ Redirect URI для vselena.ldmco.ru НЕ найден в списке разрешенных")
    
    print()
    print("=" * 80)
    
except subprocess.CalledProcessError as e:
    print(f"Ошибка выполнения команды: {e}")
    print(f"STDERR: {e.stderr}")
    sys.exit(1)
except Exception as e:
    print(f"Ошибка: {e}")
    sys.exit(1)

