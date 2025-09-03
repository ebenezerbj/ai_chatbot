param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

Write-Host "🔄 Adding all changes..." -ForegroundColor Cyan
git add .

Write-Host "📝 Committing changes..." -ForegroundColor Yellow
git commit -m "$CommitMessage"

Write-Host "🚀 Pushing to GitHub (this will trigger auto-deployment)..." -ForegroundColor Green
git push origin main

Write-Host "✅ Deployment initiated! Check GitHub Actions and Render for progress." -ForegroundColor Green
