#!/usr/bin/env python3
"""
Простой скрипт для получения OAuth credentials
Выполните этот скрипт на сервере или локально с доступом к БД
"""

import subprocess
import sys

# SQL команда
sql = """
INSERT INTO oauth_clients (id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  encode(gen_random_bytes(16), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  'SV ERP Backend',
  ARRAY['http://localhost:4000/api/auth/callback', 'http://localhost:3000/auth/callback'],
  ARRAY['openid', 'email', 'profile'],
  true,
  NOW(),
  NOW()
)
RETURNING "clientId", "clientSecret";
"""

print("="*70)
print("SQL команда для выполнения на сервере:")
print("="*70)
print(sql)
print("="*70)
print("\nВыполните на сервере:")
print("  ssh -i C:\\Users\\teramisuslik\\.ssh\\id_ed25519 root@45.144.176.42")
print("  docker exec -it $(docker ps -q -f 'name=postgres' | head -1) psql -U postgres -d loginus")
print("  # Затем вставьте SQL выше")
print("\nИли выполните одной командой:")
print(f'  ssh -i C:\\Users\\teramisuslik\\.ssh\\id_ed25519 root@45.144.176.42 "docker exec -i $(docker ps -q -f \\"name=postgres\\" | head -1) psql -U postgres -d loginus -c \\"{sql.replace(chr(10), " ").replace(chr(13), " ")}\\""')
print("="*70)

