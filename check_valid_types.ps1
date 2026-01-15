$url = "https://ai-chatbot-1-a596.onrender.com/api/admin/db-query"
$token = "mysecretadmintoken"

$body = @{
    query = "SELECT DISTINCT transaction_type FROM transactions"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
Write-Host "Valid transaction types found in database:"
$response.results | Format-Table -AutoSize
