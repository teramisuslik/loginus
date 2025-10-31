$body = '{"email":"admin@loginus.ru","password":"Admin123!"}'
$loginResponse = Invoke-WebRequest -Uri "https://vselena.ldmco.ru/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$json = $loginResponse.Content | ConvertFrom-Json
$token = $json.accessToken

Write-Host "Token получен, проверяю приглашения..."

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $invitationsResponse = Invoke-WebRequest -Uri "https://vselena.ldmco.ru/api/invitations/my" -Method GET -Headers $headers
    Write-Host "Status Code: $($invitationsResponse.StatusCode)"
    Write-Host "Response:"
    Write-Host $invitationsResponse.Content
} catch {
    Write-Host "Error: $_"
    Write-Host "Response: $($_.Exception.Response)"
}

