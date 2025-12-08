$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    title = "Ejura Branch Location"
    content = "Ejura Branch coordinates: latitude 7.38384, longitude -1.35578. This is the main branch location in Ejura for customer service and financial operations."
    tags = @("location", "branch", "ejura", "coordinates", "customer-service")
    category = "Branch Locations"
} | ConvertTo-Json -Depth 3

Write-Output "Testing simple connectivity first..."
try {
    $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/test" -Method GET -TimeoutSec 5
    Write-Output "Test endpoint response:"
    $testResponse | ConvertTo-Json
} catch {
    Write-Output "Test endpoint failed: $($_.Exception.Message)"
}

Write-Output "`nTesting debug KB endpoint..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/test-kb" -Method POST -Headers $headers -Body $body -TimeoutSec 5
    Write-Output "Debug KB endpoint works:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Output "Debug KB endpoint failed: $($_.Exception.Message)"
}

Write-Output "`nTrying actual KB endpoint with Bearer authorization..."
try {
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer "
    }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/kb" -Method POST -Headers $authHeaders -Body $body -TimeoutSec 5
    Write-Output "Success! KB entry added:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Output "KB endpoint failed: $($_.Exception.Message)"
}