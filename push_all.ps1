# push_all.ps1 - Easy one-click helper to push dashboard updates to GitHub
param(
    [string]$Message = "Update sales and collection dashboard"
)

Write-Host "🚀 Adding all files to git..." -ForegroundColor Cyan
git add .

Write-Host "📦 Committing changes..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "🌐 Pushing to GitHub main branch..." -ForegroundColor Cyan
git push origin main

Write-Host "✅ Done! GitHub Actions is now automatically building and deploying to:" -ForegroundColor Green
Write-Host "👉 https://tejawmd.github.io/SalesDashboard/" -ForegroundColor Yellow
