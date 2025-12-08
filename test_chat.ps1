$queries = @(
    'What are the checking account fees?',
    'Tell me about the bank history',
    'Who is the board chairman?',
    'What savings rate do you offer?',
    'What are the branch managers?'
)

Write-Host "Testing KB Retrieval...`n" -ForegroundColor Cyan

foreach ($query in $queries) {
    Write-Host "Query: `"$query`"" -ForegroundColor Yellow
    
    try {
        $body = @{
            userMessage = $query
            sessionId = 'test-session-123'
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/chat" `
            -Method POST `
            -Headers @{'Content-Type'='application/json'} `
            -Body $body `
            -UseBasicParsing `
            -TimeoutSec 10
        
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.reply) {
            $reply = $result.reply
            # Check if KB content is in the response
            $hasKBContent = $reply -match '($10 monthly|history|manager|savings|Richard)'
            $status = if ($hasKBContent) { 'KB FOUND' } else { 'NO KB' }
            
            Write-Host "[OK] Response ($status):"  -ForegroundColor Green
            Write-Host "  $($reply.Substring(0, [Math]::Min(150, $reply.Length)))..."
        } else {
            Write-Host "[ERROR] No reply in response" -ForegroundColor Red
        }
    } catch {
        Write-Host "[ERROR] Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}
