#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko
import os

# Настройки подключения
hostname = '45.144.176.42'
username = 'root'
key_path = r'C:\Users\teramisuslik\.ssh\id_ed25519'

# Файл для загрузки
local_file = 'loginus-backend/src/auth/services/oauth.service.ts'
remote_file = '/root/loginus-backend/src/auth/services/oauth.service.ts'

# Подключение
print(f'Connecting to {hostname}...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname, username=username, key_filename=key_path)

# Загрузка файла
print(f'Uploading {local_file} to {remote_file}...')
sftp = ssh.open_sftp()
sftp.put(local_file, remote_file)
sftp.close()
print(f'✅ File uploaded successfully')

# Перезапуск бэкенда
print('Restarting backend...')
stdin, stdout, stderr = ssh.exec_command('cd /root/loginus-backend && docker-compose restart backend')
exit_status = stdout.channel.recv_exit_status()
if exit_status == 0:
    print('✅ Backend restarted successfully')
else:
    print(f'❌ Error restarting backend. Exit status: {exit_status}')
    print('Stderr:', stderr.read().decode())

# Проверка логов
print('\nChecking logs (last 10 lines)...')
stdin, stdout, stderr = ssh.exec_command('docker logs loginus-backend --tail 10 2>&1')
print(stdout.read().decode())

ssh.close()
print('\n✅ Done!')


