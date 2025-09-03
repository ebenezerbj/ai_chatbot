@echo off
REM Quick deployment script for Windows
REM Usage: npm run deploy "commit message"

REM Combine all arguments into a single message
set "message="
:loop
if "%~1"=="" goto :done
if defined message (
    set "message=%message% %~1"
) else (
    set "message=%~1"
)
shift
goto :loop

:done
if "%message%"=="" (
    echo Error: Please provide a commit message
    echo Usage: npm run deploy "your commit message"
    exit /b 1
)

echo 🔄 Adding all changes...
git add .

echo 📝 Committing changes...
git commit -m "%message%"

echo 🚀 Pushing to GitHub (this will trigger auto-deployment)...
git push origin main

echo ✅ Deployment initiated! Check GitHub Actions and Render for progress.
