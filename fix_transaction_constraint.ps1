$url = "https://ai-chatbot-1-a596.onrender.com/api/admin/db-query"
$token = "mysecretadmintoken"

# First, let's drop the old constraint and add the correct one
$body = @{
    query = @"
-- Drop the old constraint if it exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Add the correct constraint with 'Opening Balance'
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('Deposit', 'Withdrawal', 'Transfer', 'Fee', 'Interest', 'Reversal', 'Opening Balance', 'Other'));
"@
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
    Write-Host "Success! Constraint updated to include 'Opening Balance'"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    $_.Exception.Response | Format-List
}
