param(
        [string]$CommitMessage = "deploy"
)

Write-Host "Adding all changes..." -ForegroundColor Cyan
git add -A

Write-Host "Committing changes (if any)..." -ForegroundColor Yellow
try {
    git commit -m "$CommitMessage" | Out-Null
} catch {
    Write-Host "Nothing to commit." -ForegroundColor DarkYellow
}

Write-Host "Pushing to GitHub (this will trigger auto-deployment)..." -ForegroundColor Green
git push origin main

Write-Host "Deployment initiated. Check GitHub Actions and Render for progress." -ForegroundColor Green
