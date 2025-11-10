#!/usr/bin/env python3
import subprocess
import sys

sql = """
INSERT INTO oauth_clients (id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'ad829ce93adefd15b0804e88e150062c',
  'temp_secret_change_me',
  'Vselena Service',
  ARRAY['https://vselena.ldmco.ru/api/auth/callback'],
  ARRAY['openid', 'email', 'profile'],
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("clientId") 
DO UPDATE SET 
  "redirectUris" = CASE 
    WHEN NOT ('https://vselena.ldmco.ru/api/auth/callback' = ANY("redirectUris")) 
    THEN array_append("redirectUris", 'https://vselena.ldmco.ru/api/auth/callback')
    ELSE "redirectUris"
  END,
  "updatedAt" = NOW();
"""

check_sql = """
SELECT "clientId", name, "redirectUris", array_length("redirectUris", 1) as uris_count
FROM oauth_clients 
WHERE "clientId" = 'ad829ce93adefd15b0804e88e150062c';
"""

cmd = f'ssh -i C:\\Users\\teramisuslik\\.ssh\\id_ed25519 root@45.144.176.42 "docker exec -i loginus-db psql -U loginus -d loginus_dev"'

process = subprocess.Popen(
    cmd,
    shell=True,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = process.communicate(input=sql)
print("INSERT result:")
print(stdout)
if stderr:
    print("Errors:", stderr, file=sys.stderr)

# Проверка
check_process = subprocess.Popen(
    cmd,
    shell=True,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

check_stdout, check_stderr = check_process.communicate(input=check_sql)
print("\nCheck result:")
print(check_stdout)
if check_stderr:
    print("Errors:", check_stderr, file=sys.stderr)

