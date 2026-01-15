$url = "https://ai-chatbot-1-a596.onrender.com/api/admin/db-query"
$token = "mysecretadmintoken"

$body = @{
    query = "SELECT column_name, data_type, character_maximum_length, column_default FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transaction_type'"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
Write-Host "Transaction type column info:"
$response.results | Format-List
