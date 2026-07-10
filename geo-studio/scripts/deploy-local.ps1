# GEO Studio 本地生产模拟部署
# 用法: .\scripts\deploy-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "==> [1/5] Postgres"
Push-Location (Join-Path $Root "backend")
npm run db:up
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Write-Host "==> [2/5] Prisma migrate + generate"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
npm run prisma:generate
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Write-Host "==> [3/5] Backend build"
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "==> [4/5] Web build"
Push-Location (Join-Path $Root "web")
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "==> [5/5] Start backend (prod) + web preview"
$env:WEB_ORIGIN = "http://localhost:4173"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; `$env:WEB_ORIGIN='http://localhost:4173'; npm run start:prod"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\web'; npm run preview"

Write-Host ""
Write-Host "Deployed (local prod simulation):"
Write-Host "  API:  http://localhost:3000/health"
Write-Host "  Web:  http://localhost:4173"
Write-Host ""
Write-Host "Stop: close the two PowerShell windows."
