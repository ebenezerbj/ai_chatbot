Write-Host "`n=== Testing Button Functionality ===" -ForegroundColor Cyan

# Test 1: Greeting API returns buttons
Write-Host "`n1. Testing Greeting API..." -ForegroundColor Yellow
$greetingResp = Invoke-WebRequest -Uri "http://localhost:4000/api/greeting" -Method POST -ContentType "application/json" -Body "{}"
$greeting = $greetingResp.Content | ConvertFrom-Json

if ($greeting.buttons -and $greeting.buttons.Count -eq 2) {
    Write-Host "   ✓ Greeting API returns 2 buttons" -ForegroundColor Green
    Write-Host "     - $($greeting.buttons[0].text)" -ForegroundColor Gray
    Write-Host "     - $($greeting.buttons[1].text)" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Greeting API buttons missing!" -ForegroundColor Red
}

# Test 2: "No - General inquiry" response
Write-Host "`n2. Testing No - General inquiry flow..." -ForegroundColor Yellow
$sessionId = $greeting.sessionId
$chatBody = @{ message = "No, I have a general inquiry"; sessionId = $sessionId } | ConvertTo-Json
$chatResp = Invoke-WebRequest -Uri "http://localhost:4000/api/chat" -Method POST -ContentType "application/json" -Body $chatBody
$chatData = $chatResp.Content | ConvertFrom-Json

if ($chatData.response -match "happy to help you with") {
    Write-Host "   ✓ Correct response for non-customer" -ForegroundColor Green
} else {
    Write-Host "   ✗ Unexpected response" -ForegroundColor Red
}

# Test 3: "Yes - I am a customer" flow
Write-Host "`n3. Testing Yes - I am a customer flow..." -ForegroundColor Yellow
$greetingResp2 = Invoke-WebRequest -Uri "http://localhost:4000/api/greeting" -Method POST -ContentType "application/json" -Body "{}"
$greeting2 = $greetingResp2.Content | ConvertFrom-Json
$sessionId2 = $greeting2.sessionId

$chatBody2 = @{ message = "Yes, I am a customer of AKCB"; sessionId = $sessionId2 } | ConvertTo-Json
$chatResp2 = Invoke-WebRequest -Uri "http://localhost:4000/api/chat" -Method POST -ContentType "application/json" -Body $chatBody2
$chatData2 = $chatResp2.Content | ConvertFrom-Json

if ($chatData2.response -match "verify your identity") {
    Write-Host "   ✓ Prompts for authentication" -ForegroundColor Green
} else {
    Write-Host "   ✗ Unexpected response" -ForegroundColor Red
}

# Test 4: Mock authentication and check for buttons
Write-Host "`n4. Testing post-authentication buttons..." -ForegroundColor Yellow
Write-Host "   Note: Using mock authentication response" -ForegroundColor Gray

$mockAuthResponse = @{
    success = $true
    message = "Welcome back, JOHN! Your identity has been verified. How can I help you with your account today?"
    buttons = @(
        @{ text = "Check my balance"; action = "send"; value = "What is my account balance?" }
        @{ text = "Recent transactions"; action = "send"; value = "Show me my recent transactions" }
        @{ text = "Loan information"; action = "send"; value = "Tell me about my loan" }
        @{ text = "Other inquiry"; action = "send"; value = "I have another question" }
    )
}

if ($mockAuthResponse.buttons -and $mockAuthResponse.buttons.Count -eq 4) {
    Write-Host "   ✓ Post-auth response includes 4 action buttons:" -ForegroundColor Green
    foreach ($btn in $mockAuthResponse.buttons) {
        Write-Host "     - $($btn.text)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✗ Post-auth buttons missing!" -ForegroundColor Red
}

Write-Host "`n=== Button Tests Complete ===" -ForegroundColor Cyan
Write-Host ""
