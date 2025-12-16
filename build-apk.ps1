Write-Host "AKCB Chatbot APK Builder v1.5.0" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
if (-not (Test-Path ".\android")) {
    Write-Host "Error: android directory not found!" -ForegroundColor Red
    exit 1
}

try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "Java found: $javaVersion`n" -ForegroundColor Green
} catch {
    Write-Host "Error: Java not found. Install JDK 11+ from https://adoptium.net/" -ForegroundColor Red
    exit 1
}

Write-Host "[2/5] Navigating to android directory..." -ForegroundColor Yellow
Set-Location ".\android"

Write-Host "`n[3/5] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".\app\build\outputs\apk") {
    Remove-Item ".\app\build\outputs\apk" -Recurse -Force
    Write-Host "Cleaned previous APK builds`n" -ForegroundColor Green
}

Write-Host "[4/5] Building APK (this may take a few minutes)..." -ForegroundColor Yellow
& .\gradlew.bat clean assembleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nBuild failed! Check errors above." -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "`n[5/5] Locating APK files..." -ForegroundColor Yellow
$apkPath = ".\app\build\outputs\apk\release"
if (Test-Path $apkPath) {
    $apkFiles = Get-ChildItem -Path $apkPath -Filter "*.apk"
    
    if ($apkFiles.Count -gt 0) {
        Write-Host "`nBUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "APK files generated:`n" -ForegroundColor Cyan
        
        foreach ($apk in $apkFiles) {
            $sizeMB = [math]::Round($apk.Length / (1024*1024), 2)
            Write-Host "File: $($apk.Name)" -ForegroundColor White
            Write-Host "Size: $sizeMB MB" -ForegroundColor Gray
            Write-Host "Path: $($apk.FullName)`n" -ForegroundColor Gray
        }
        
        $rootApkPath = "..\AKCB-Chatbot-v1.5.0.apk"
        $mainApk = $apkFiles | Where-Object { $_.Name -notlike "*-unsigned*" } | Select-Object -First 1
        if ($mainApk) {
            Copy-Item $mainApk.FullName $rootApkPath -Force
            Write-Host "APK copied to: $rootApkPath`n" -ForegroundColor Green
        }
    }
}

Set-Location ..
Write-Host "Build process completed!" -ForegroundColor Cyan
