#!/bin/bash
# Скрипт для деплоя исправлений

scp -i C:\Users\teramisuslik\.ssh\id_ed25519 frontend/index.html root@45.144.176.42:/tmp/index.html
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend/src/auth/controllers/oauth.controller.ts root@45.144.176.42:/tmp/oauth.controller.ts
scp -i C:\Users\teramisuslik\.ssh\id_ed25519 loginus-backend/src/auth/services/nfa.service.ts root@45.144.176.42:/tmp/nfa.service.ts

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 << 'EOF'
cp /tmp/index.html /opt/vselena_back/frontend/
cp /tmp/oauth.controller.ts /opt/vselena_back/src/auth/controllers/
cp /tmp/nfa.service.ts /opt/vselena_back/src/auth/services/

docker cp /opt/vselena_back/frontend/index.html loginus-backend:/app/frontend/
docker cp /opt/vselena_back/src/auth/controllers/oauth.controller.ts loginus-backend:/app/src/auth/controllers/
docker cp /opt/vselena_back/src/auth/services/nfa.service.ts loginus-backend:/app/src/auth/services/

echo "Files synced successfully"
EOF

