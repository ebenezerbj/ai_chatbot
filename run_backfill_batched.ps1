# Backfill Opening Balances in batches
param(
    [string]$BaseUrl = "https://ai-chatbot-1-a596.onrender.com",
    [int]$BatchSize = 5000
)

$adminToken = "mysecretadmintoken"

Write-Host "Opening Balance Backfill - Batch Processing" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# First, get total count
Write-Host "Checking how many accounts need processing..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

$countQuery = @{
    query = "SELECT COUNT(*) as count FROM account_balances ab WHERE ab.ledger_balance <> 0 AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.account_number = ab.account_number)"
    params = @()
} | ConvertTo-Json

try {
    $countResult = Invoke-RestMethod -Uri "$BaseUrl/api/admin/db-query" -Method Post -Headers $headers -Body $countQuery -TimeoutSec 30
    $totalAccounts = $countResult.rows[0].count
    
    Write-Host "Total accounts needing Opening Balance: $totalAccounts" -ForegroundColor White
    Write-Host ""
    
    if ($totalAccounts -eq 0) {
        Write-Host "No accounts need backfilling!" -ForegroundColor Green
        exit 0
    }
    
    $batches = [Math]::Ceiling($totalAccounts / $BatchSize)
    Write-Host "Will process in $batches batches of $BatchSize accounts each" -ForegroundColor Cyan
    Write-Host ""
    
    $confirmation = Read-Host "Type 'YES' to proceed"
    
    if ($confirmation -ne "YES") {
        Write-Host "Operation cancelled." -ForegroundColor Red
        exit 0
    }
    
    Write-Host ""
    Write-Host "Starting batch processing..." -ForegroundColor Green
    Write-Host ""
    
    $totalProcessed = 0
    $totalErrors = 0
    
    for ($i = 0; $i -lt $batches; $i++) {
        $batchNum = $i + 1
        $offset = $i * $BatchSize
        
        Write-Host "Processing batch $batchNum of $batches (offset: $offset)..." -ForegroundColor Cyan
        
        # Get batch of accounts
        $batchQuery = @{
            query = "SELECT ab.account_number, ab.ledger_balance FROM account_balances ab WHERE ab.ledger_balance <> 0 AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.account_number = ab.account_number) ORDER BY ab.account_number LIMIT $BatchSize OFFSET $offset"
            params = @()
        } | ConvertTo-Json
        
        $batchAccounts = Invoke-RestMethod -Uri "$BaseUrl/api/admin/db-query" -Method Post -Headers $headers -Body $batchQuery -TimeoutSec 60
        
        if ($batchAccounts.rowCount -eq 0) {
            Write-Host "  No more accounts to process" -ForegroundColor Yellow
            break
        }
        
        Write-Host "  Retrieved $($batchAccounts.rowCount) accounts" -ForegroundColor White
        
        # Insert transactions for this batch
        $successCount = 0
        $errorCount = 0
        
        foreach ($account in $batchAccounts.rows) {
            try {
                $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                $refNumber = "OB-$($account.account_number)-$timestamp"
                $balance = [decimal]$account.ledger_balance
                $description = "Opening Balance - GHS $($balance.ToString('F2'))"
                
                $insertQuery = @{
                    query = "INSERT INTO transactions (account_number, transaction_date, description, debit_amount, credit_amount, balance_after, reference_number, transaction_type, channel) VALUES ('$($account.account_number)', CURRENT_TIMESTAMP, '$description', 0, $balance, $balance, '$refNumber', 'Opening Balance', 'Internal')"
                    params = @()
                } | ConvertTo-Json
                
                Invoke-RestMethod -Uri "$BaseUrl/api/admin/db-query" -Method Post -Headers $headers -Body $insertQuery -TimeoutSec 30 | Out-Null
                $successCount++
                $totalProcessed++
            }
            catch {
                $errorCount++
                $totalErrors++
            }
        }
        
        Write-Host "  Batch complete: $successCount success, $errorCount errors" -ForegroundColor $(if ($errorCount -gt 0) { "Yellow" } else { "Green" })
        Write-Host "  Total progress: $totalProcessed/$totalAccounts" -ForegroundColor White
        Write-Host ""
        
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Backfill Complete!" -ForegroundColor Green
    Write-Host "Total Processed: $totalProcessed" -ForegroundColor White
    Write-Host "Total Errors: $totalErrors" -ForegroundColor $(if ($totalErrors -gt 0) { "Yellow" } else { "White" })
    Write-Host "============================================" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
