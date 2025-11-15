#!/bin/bash
# Скопировать файл в контейнер
docker cp /tmp/multi-auth.controller.ts loginus-backend:/app/src/auth/controllers/multi-auth.controller.ts

# Перезапустить контейнер (он работает в watch mode, так что пересборка не нужна)
docker restart loginus-backend

# Проверить логи
echo "Waiting 5 seconds for container to start..."
sleep 5
docker logs loginus-backend --tail 20



