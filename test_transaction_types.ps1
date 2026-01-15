$url = "https://ai-chatbot-1-a596.onrender.com/api/admin/db-query"
$token = "mysecretadmintoken"

# Try to insert a test record with 'Opening Balance'
$body = @{
    query = "INSERT INTO transactions (account_number, transaction_date, description, debit_amount, credit_amount, balance_after, reference_number, transaction_type, channel) VALUES ('TEST123', CURRENT_TIMESTAMP, 'Test Opening Balance', 0, 100, 100, 'TEST-123', 'Opening Balance', 'Internal') RETURNING *"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
    Write-Host "Success! Opening Balance is valid:"
    $response.results | Format-List
} catch {
    Write-Host "Error with 'Opening Balance': $($_.Exception.Message)"
    
    # Try with 'Deposit' instead
    Write-Host "`nTrying with 'Deposit'..."
    $body2 = @{
        query = "INSERT INTO transactions (account_number, transaction_date, description, debit_amount, credit_amount, balance_after, reference_number, transaction_type, channel) VALUES ('TEST123', CURRENT_TIMESTAMP, 'Test Deposit', 0, 100, 100, 'TEST-124', 'Deposit', 'Internal') RETURNING *"
    } | ConvertTo-Json
    
    $response2 = Invoke-RestMethod -Uri $url -Method Post -Body $body2 -Headers $headers
    Write-Host "Deposit worked:"
    $response2.results | Format-List
}
