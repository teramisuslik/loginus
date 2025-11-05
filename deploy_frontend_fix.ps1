$content = Get-Content -Path "frontend\index.html" -Raw -Encoding UTF8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [System.Convert]::ToBase64String($bytes)

$sshCommand = @"
echo '$base64' | base64 -d > /tmp/index.html && docker cp /tmp/index.html loginus-backend:/app/frontend/index.html && rm /tmp/index.html && echo 'File deployed successfully'
"@

ssh -i C:\Users\teramisuslik\.ssh\id_ed25519 root@45.144.176.42 $sshCommand

