#!/usr/bin/env python3
import subprocess
import sys

files_to_upload = [
    ("loginus-backend/src/rbac/rbac.service.ts", "/app/src/rbac/rbac.service.ts"),
    ("loginus-backend/src/rbac/rbac.module.ts", "/app/src/rbac/rbac.module.ts"),
]

ssh_key = r"C:\Users\teramisuslik\.ssh\id_ed25519"
server = "root@45.144.176.42"

for local_path, remote_path in files_to_upload:
    print(f"Uploading {local_path} to {remote_path}...")
    try:
        with open(local_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Upload via docker exec
        cmd = [
            'ssh', '-i', ssh_key, server,
            f'docker exec -i loginus-backend sh -c "cat > {remote_path}"'
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = proc.communicate(input=content)
        
        if proc.returncode == 0:
            print(f"✅ Successfully uploaded {local_path}")
        else:
            print(f"❌ Error uploading {local_path}: {stderr}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Exception uploading {local_path}: {e}")
        sys.exit(1)

print("\n🔄 Restarting container...")
restart_cmd = ['ssh', '-i', ssh_key, server, 'docker restart loginus-backend']
subprocess.run(restart_cmd, check=True)
print("✅ Container restarted")

print("\n⏳ Waiting for container to start...")
import time
time.sleep(15)

print("\n📊 Checking role '4' in all tables...")
check_cmd = [
    'ssh', '-i', ssh_key, server,
    '''docker exec loginus-db psql -U loginus -d loginus_dev -c "SELECT 'roles' as table_name, COUNT(*) as count FROM roles WHERE name = '4' UNION ALL SELECT 'organization_roles' as table_name, COUNT(*) FROM organization_roles WHERE name = '4' UNION ALL SELECT 'team_roles' as table_name, COUNT(*) FROM team_roles WHERE name = '4';"'''
]
result = subprocess.run(check_cmd, capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("Errors:", result.stderr)

