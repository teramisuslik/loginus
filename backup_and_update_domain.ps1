# PowerShell скрипт для создания бэкапа и обновления домена на сервере
$sshKey = "C:\Users\teramisuslik\.ssh\id_ed25519"
$server = "root@45.144.176.42"

Write-Host "Создание бэкапа на сервере..." -ForegroundColor Yellow

# Создаем бэкап
$backupCommand = @"
cd /opt/vselena_back
BACKUP_FILE="/root/backup_`$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf `$BACKUP_FILE .
ls -lh `$BACKUP_FILE
echo "Backup created: `$BACKUP_FILE"
"@

# Выполняем команду через SSH
ssh -i $sshKey $server $backupCommand

Write-Host "Бэкап создан!" -ForegroundColor Green

