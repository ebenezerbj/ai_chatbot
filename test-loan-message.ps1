# Test loan balance message after authentication
# This simulates a customer asking about their loan balance

$baseUrl = "http://localhost:4000"

Write-Host "`n=== Testing Loan Balance Message ===" -ForegroundColor Cyan
Write-Host "This test will simulate a customer journey and check loan balance response`n"

# Step 1: Get greeting and session
Write-Host "Step 1: Getting greeting..." -ForegroundColor Yellow
$greetingResponse = Invoke-RestMethod -Uri "$baseUrl/api/greeting" -Method GET
$sessionId = $greetingResponse.sessionId
Write-Host "Session ID: $sessionId" -ForegroundColor Green

# Step 2: Answer yes to being a customer
Write-Host "`nStep 2: Answering 'Yes - I'm a customer'..." -ForegroundColor Yellow
$customerResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Headers @{
    "Content-Type" = "application/json"
} -Body (@{
    message = "Yes - I'm a customer"
    sessionId = $sessionId
} | ConvertTo-Json)

Write-Host "Response: $($customerResponse.reply.Substring(0, [Math]::Min(100, $customerResponse.reply.Length)))..." -ForegroundColor Green

# Step 3: Provide account number (example: ACC001)
Write-Host "`nStep 3: Providing account number..." -ForegroundColor Yellow
$accountResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Headers @{
    "Content-Type" = "application/json"
} -Body (@{
    message = "ACC001"
    sessionId = $sessionId
} | ConvertTo-Json)

Write-Host "Response: $($accountResponse.reply.Substring(0, [Math]::Min(100, $accountResponse.reply.Length)))..." -ForegroundColor Green

# Step 4: Provide OTP (example: 123456 - this is a test OTP)
Write-Host "`nStep 4: Providing OTP (using test OTP 123456)..." -ForegroundColor Yellow
$otpResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Headers @{
    "Content-Type" = "application/json"
} -Body (@{
    message = "123456"
    sessionId = $sessionId
} | ConvertTo-Json)

Write-Host "Authentication response received" -ForegroundColor Green

# Step 5: Click "Loan info" button or ask about loan balance
Write-Host "`nStep 5: Requesting loan information..." -ForegroundColor Yellow
$loanResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Headers @{
    "Content-Type" = "application/json"
} -Body (@{
    message = "Loan info"
    sessionId = $sessionId
} | ConvertTo-Json)

Write-Host "`n=== LOAN BALANCE RESPONSE ===" -ForegroundColor Cyan
Write-Host $loanResponse.reply -ForegroundColor White
Write-Host "`n=========================`n" -ForegroundColor Cyan

# Verify the new message is present
if ($loanResponse.reply -match "currently updating our loan records" -and 
    $loanResponse.reply -match "Visit your nearest AKCB branch") {
    Write-Host "✓ SUCCESS: New loan balance message is working correctly!" -ForegroundColor Green
    Write-Host "✓ Customers are now redirected to visit branch for loan info" -ForegroundColor Green
} else {
    Write-Host "✗ WARNING: Response doesn't contain expected branch visit message" -ForegroundColor Red
}

Write-Host "`nTest completed!`n" -ForegroundColor Cyan
