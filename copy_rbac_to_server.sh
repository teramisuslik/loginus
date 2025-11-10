#!/bin/bash
# Скрипт для копирования rbac.service.ts на сервер

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 "cd /opt/vselena_back && cat > src/rbac/rbac.service.ts << 'ENDFILE'
$(cat loginus-backend/src/rbac/rbac.service.ts)
ENDFILE
echo 'File copied'"

