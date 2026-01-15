$url = "https://ai-chatbot-1-a596.onrender.com/api/admin/db-query"
$token = "mysecretadmintoken"

$body = @{
    query = "SELECT con.conname, pg_get_constraintdef(con.oid) as definition FROM pg_constraint con INNER JOIN pg_class rel ON rel.oid = con.conrelid WHERE rel.relname = 'transactions' AND con.contype = 'c'"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
$response.results | ConvertTo-Json -Depth 10
