#!/bin/bash
# Скрипт для обновления домена на сервере

SSH_KEY="C:\\Users\\teramisuslik\\.ssh\\id_ed25519"
SERVER="root@45.144.176.42"

echo "=== Шаг 1: Проверка структуры директорий ==="
ssh -i "$SSH_KEY" "$SERVER" "ls -la /opt/ | grep -E 'vselena|loginus'; echo '---'; docker ps --format '{{.Names}}' | head -5"

echo ""
echo "=== Шаг 2: Определение рабочей директории ==="
ssh -i "$SSH_KEY" "$SERVER" "docker inspect loginus-backend 2>/dev/null | grep -A 5 'WorkingDir' || echo 'Container not found'; echo '---'; ls -la /opt/ | grep -E 'vselena|loginus'"

echo ""
echo "=== Шаг 3: Создание бэкапа ==="
ssh -i "$SSH_KEY" "$SERVER" "cd /opt/vselena_back && BACKUP_FILE=\"/root/backup_\$(date +%Y%m%d_%H%M%S).tar.gz\" && tar -czf \"\$BACKUP_FILE\" . && ls -lh \"\$BACKUP_FILE\" && echo \"Backup created: \$BACKUP_FILE\""

echo ""
echo "=== Шаг 4: Проверка docker-compose.yml ==="
ssh -i "$SSH_KEY" "$SERVER" "cd /opt/vselena_back && grep -n 'FRONTEND_URL\|GITHUB_REDIRECT_URI' docker-compose.yml 2>/dev/null || echo 'docker-compose.yml not found in /opt/vselena_back'"

echo ""
echo "=== Шаг 5: Обновление переменных окружения ==="
ssh -i "$SSH_KEY" "$SERVER" "cd /opt/vselena_back && if [ -f docker-compose.yml ]; then sed -i 's|FRONTEND_URL: https://vselena.ldmco.ru|FRONTEND_URL: https://loginus.startapus.com|g' docker-compose.yml && sed -i 's|GITHUB_REDIRECT_URI: https://vselena.ldmco.ru|GITHUB_REDIRECT_URI: https://loginus.startapus.com|g' docker-compose.yml && echo 'docker-compose.yml updated'; fi"

echo ""
echo "=== Шаг 6: Проверка Nginx конфигурации ==="
ssh -i "$SSH_KEY" "$SERVER" "ls -la /etc/nginx/sites-enabled/ 2>/dev/null; ls -la /etc/nginx/conf.d/ 2>/dev/null | head -10"

echo ""
echo "=== Шаг 7: Поиск конфигурации Nginx с vselena ==="
ssh -i "$SSH_KEY" "$SERVER" "grep -r 'vselena.ldmco.ru' /etc/nginx/ 2>/dev/null | head -10"

echo ""
echo "=== Готово! ==="

