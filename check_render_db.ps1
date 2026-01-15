# Check Render database through the deployed API
$baseUrl = "https://ai-chatbot-8g44.onrender.com"

Write-Host "Checking Production Database via API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check health endpoint
Write-Host "1. Testing API Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 30
    Write-Host "✅ API is online" -ForegroundColor Green
    Write-Host "   DB Status: $($health.database)" -ForegroundColor White
} catch {
    Write-Host "❌ API health check failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Get admin stats (requires admin token)
Write-Host "2. Checking Database Stats..." -ForegroundColor Yellow
$adminToken = "mysecretadmintoken"

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/admin/stats" -Method Get -Headers $headers -TimeoutSec 30
    Write-Host "✅ Database Stats Retrieved:" -ForegroundColor Green
    Write-Host "   Total Customers: $($stats.totalCustomers)" -ForegroundColor White
    Write-Host "   Total Transactions: $($stats.totalTransactions)" -ForegroundColor White
    Write-Host "   Total Sessions: $($stats.totalSessions)" -ForegroundColor White
} catch {
    Write-Host "⚠️ Stats endpoint not available: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Note: To query the database directly, you need the External Database URL from Render dashboard" -ForegroundColor Cyan
