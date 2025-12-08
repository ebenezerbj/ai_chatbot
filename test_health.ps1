try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Output "Health endpoint works:"
    $response | ConvertTo-Json
} catch {
    Write-Output "Health endpoint error:"
    Write-Output $_.Exception.Message
}