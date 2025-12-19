# Test customer upload endpoint
# Usage: .\test_customer_upload.ps1

$SERVER_URL = "https://ai-chatbot-latest.onrender.com"
$CSV_FILE = "Accounts.csv"
$TOKEN_FILE = ".admin-token"

# Check if token file exists
if (-not (Test-Path $TOKEN_FILE)) {
    Write-Host "❌ Token file not found: $TOKEN_FILE" -ForegroundColor Red
    Write-Host "Please run the admin login first" -ForegroundColor Yellow
    exit 1
}

# Check if CSV file exists
if (-not (Test-Path $CSV_FILE)) {
    Write-Host "❌ CSV file not found: $CSV_FILE" -ForegroundColor Red
    exit 1
}

# Read token
$token = Get-Content $TOKEN_FILE -Raw
$token = $token.Trim()

Write-Host "📤 Testing customer upload..." -ForegroundColor Cyan
Write-Host "Server: $SERVER_URL" -ForegroundColor Gray
Write-Host "File: $CSV_FILE" -ForegroundColor Gray

# Prepare multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$fileContent = [System.IO.File]::ReadAllBytes($CSV_FILE)
$fileName = Split-Path $CSV_FILE -Leaf

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"customers`"; filename=`"$fileName`"",
    "Content-Type: text/csv",
    "",
    [System.Text.Encoding]::UTF8.GetString($fileContent),
    "--$boundary--"
)

$body = $bodyLines -join "`r`n"

try {
    $response = Invoke-WebRequest `
        -Uri "$SERVER_URL/api/admin/import-customers" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 300

    Write-Host "✅ Upload successful!" -ForegroundColor Green
    Write-Host ""
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "  Total Records: $($result.totalRecords)" -ForegroundColor White
    Write-Host "  Successful: $($result.successCount)" -ForegroundColor Green
    Write-Host "  Errors: $($result.errorCount)" -ForegroundColor $(if ($result.errorCount -gt 0) { "Yellow" } else { "Gray" })
    Write-Host "  Summary: $($result.summary)" -ForegroundColor Gray
    
    if ($result.errors -and $result.errors.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️ Errors:" -ForegroundColor Yellow
        $result.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    
    if ($result.stats) {
        Write-Host ""
        Write-Host "📈 Database Stats:" -ForegroundColor Cyan
        Write-Host "  Total Accounts: $($result.stats.totalAccounts)" -ForegroundColor White
        if ($result.stats.lastUpdate) {
            Write-Host "  Last Update: $($result.stats.lastUpdate)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
