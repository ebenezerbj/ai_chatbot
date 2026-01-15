# Trigger Opening Balance backfill via API
param(
    [string]$BaseUrl = "https://ai-chatbot-1-a596.onrender.com"
)

$adminToken = "mysecretadmintoken"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Opening Balance Backfill - One-Time Operation           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  WARNING: This will create Opening Balance transactions" -ForegroundColor Yellow
Write-Host "   for ALL accounts that have balances but no transaction history." -ForegroundColor Yellow
Write-Host ""
Write-Host "   This operation:" -ForegroundColor White
Write-Host "   • Will NOT affect accounts that already have transactions" -ForegroundColor White
Write-Host "   • Will NOT modify any existing balances" -ForegroundColor White
Write-Host "   • Creates read-only transaction records for historical reference" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Type 'YES' to proceed with backfill"

if ($confirmation -ne "YES") {
    Write-Host "`n❌ Operation cancelled." -ForegroundColor Red
    exit 0
}

Write-Host "`nStarting backfill operation..." -ForegroundColor Cyan
Write-Host "This may take several minutes for large databases.`n" -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin/backfill-opening-balances" -Method Post -Headers $headers -TimeoutSec 300
    
    Write-Host "✅ Backfill completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    Write-Host "  Total Accounts Processed: $($response.total)" -ForegroundColor White
    Write-Host "  Successful: $($response.processed)" -ForegroundColor Green
    Write-Host "  Errors: $($response.errors)" -ForegroundColor $(if ($response.errors -gt 0) { "Yellow" } else { "White" })
    Write-Host ""
    Write-Host "✨ Customers can now view their transaction history in the chatbot!" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Backfill failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
