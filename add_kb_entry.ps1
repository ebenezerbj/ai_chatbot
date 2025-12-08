$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer "
}

$body = @{
    title = "Ejura Branch Location"
    content = "Ejura Branch coordinates: latitude 7.38384, longitude -1.35578"
    tags = @("location", "branch", "ejura", "coordinates")
    category = "Locations"
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/kb" -Method POST -Headers $headers -Body $body
    Write-Output "Success! KB entry added:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Output "Error adding KB entry:"
    Write-Output $_.Exception.Message
}