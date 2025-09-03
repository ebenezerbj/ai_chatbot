#!/bin/bash

# Quick deployment script
# Usage: npm run deploy "commit message"

if [ -z "$1" ]; then
  echo "Error: Please provide a commit message"
  echo "Usage: npm run deploy \"your commit message\""
  exit 1
fi

echo "🔄 Adding all changes..."
git add .

echo "📝 Committing changes..."
git commit -m "$1"

echo "🚀 Pushing to GitHub (this will trigger auto-deployment)..."
git push origin main

echo "✅ Deployment initiated! Check GitHub Actions and Render for progress."
