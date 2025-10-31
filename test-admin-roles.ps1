Start-Sleep -Seconds 5
$body = '{"email":"admin@loginus.ru","password":"Admin123!"}'
$response = Invoke-WebRequest -Uri "https://vselena.ldmco.ru/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$json = $response.Content | ConvertFrom-Json

Write-Host "Email: $($json.user.email)"
Write-Host "Roles Count: $($json.user.roles.Count)"

if ($json.user.roles.Count -gt 0) {
    $json.user.roles | ForEach-Object {
        Write-Host "Role: $($_.name), isGlobal: $($_.isGlobal)"
    }
} else {
    Write-Host "NO ROLES LOADED!"
}
