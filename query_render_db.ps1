# Query Render PostgreSQL through the deployed API
param(
    [string]$Query = "SELECT COUNT(*) as count FROM transactions WHERE reference_number LIKE 'BAL-%'",
    [string]$BaseUrl = "https://ai-chatbot-1-a596.onrender.com"
)

$adminToken = "mysecretadmintoken"

Write-Host "Querying Production Database via API..." -ForegroundColor Cyan
Write-Host "Query: $Query" -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        query = $Query
        params = @()
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/admin/db-query" -Method Post -Headers $headers -Body $body -TimeoutSec 60
    
    Write-Host "✅ Query executed successfully!" -ForegroundColor Green
    Write-Host "Row Count: $($response.rowCount)" -ForegroundColor White
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Yellow
    $response.rows | Format-Table -AutoSize
    
} catch {
    Write-Host "❌ Query failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
