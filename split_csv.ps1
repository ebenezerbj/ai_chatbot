# Split large CSV into smaller batches
param(
    [string]$InputFile = "Accounts.csv",
    [int]$BatchSize = 5000
)

Write-Host "Splitting $InputFile into batches of $BatchSize records..." -ForegroundColor Cyan

# Read CSV
$csv = Import-Csv $InputFile
$totalRecords = $csv.Count
$batchCount = [Math]::Ceiling($totalRecords / $BatchSize)

Write-Host "Total records: $totalRecords" -ForegroundColor Yellow
Write-Host "Creating $batchCount batch files..." -ForegroundColor Yellow

# Create batches
for ($i = 0; $i -lt $batchCount; $i++) {
    $start = $i * $BatchSize
    $end = [Math]::Min(($i + 1) * $BatchSize - 1, $totalRecords - 1)
    $batchNumber = $i + 1
    
    $batchFile = "Accounts_batch_$batchNumber.csv"
    $csv[$start..$end] | Export-Csv -Path $batchFile -NoTypeInformation
    
    $batchRecords = $end - $start + 1
    Write-Host "Created $batchFile with $batchRecords records" -ForegroundColor Green
}

Write-Host "`n✅ Done! Upload each batch file separately through the admin portal." -ForegroundColor Green
Write-Host "Tip: Start with batch 1, then upload batch 2, 3, etc." -ForegroundColor Cyan
