#!/usr/bin/env python3
import subprocess
import os

files = [
    ('loginus-backend/src/rbac/rbac.service.ts', '/app/src/rbac/rbac.service.ts'),
    ('loginus-backend/src/rbac/rbac.module.ts', '/app/src/rbac/rbac.module.ts'),
    ('loginus-backend/src/organizations/organizations.service.ts', '/app/src/organizations/organizations.service.ts'),
]

ssh_key = r'C:\Users\teramisuslik\.ssh\id_ed25519'
server = 'root@45.144.176.42'

for local_path, remote_path in files:
    print(f'Uploading {local_path}...')
    cmd = ['scp', '-i', ssh_key, local_path, f'{server}:/tmp/temp_file']
    subprocess.run(cmd, check=True)
    
    cmd = ['ssh', '-i', ssh_key, server, f'docker cp /tmp/temp_file loginus-backend:{remote_path}']
    subprocess.run(cmd, check=True)
    print(f'✅ Uploaded {local_path}')

print('Restarting container...')
subprocess.run(['ssh', '-i', ssh_key, server, 'docker restart loginus-backend'], check=True)
print('✅ Done!')

