#!/bin/bash
ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 << 'EOF'
echo "=== Checking Docker containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "=== Checking loginus-backend logs (last 50 lines) ==="
docker logs loginus-backend --tail 50 2>&1 | grep -E "OAuth|authorize|redirect|vselena|User authorized" || echo "No matching logs found"

echo ""
echo "=== Checking nginx error logs ==="
tail -50 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error log found"

echo ""
echo "=== Checking application logs ==="
find /opt -name "*.log" -type f -mtime -1 2>/dev/null | head -5
EOF

