# GEO Studio 本地环境一键配置（Windows PowerShell）
# 用法：在 geo-studio 根目录执行 .\scripts\setup-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Web = Join-Path $Root "web"

Write-Host "==> GEO Studio 本地环境配置" -ForegroundColor Cyan
Write-Host "    根目录: $Root"

# 1. 检查 Node
$nodeVer = node -v
Write-Host "    Node: $nodeVer"

# 2. 检查 Docker
try {
  docker info | Out-Null
} catch {
  Write-Error "Docker 未运行。请先启动 Docker Desktop，再重试。"
}

# 3. 复制 .env（若不存在）
$envExample = Join-Path $Backend ".env.example"
$envFile = Join-Path $Backend ".env"
if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "    已创建 backend/.env（从 .env.example 复制）" -ForegroundColor Yellow
} else {
  Write-Host "    backend/.env 已存在，跳过复制"
}

# 4. 启动数据库
Write-Host "==> 启动 PostgreSQL + Redis..." -ForegroundColor Cyan
Push-Location $Backend
docker compose up -d
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

# 5. 安装依赖（若 node_modules 缺失）
if (-not (Test-Path (Join-Path $Backend "node_modules"))) {
  Write-Host "==> 安装 backend 依赖..." -ForegroundColor Cyan
  npm install
}
if (-not (Test-Path (Join-Path $Web "node_modules"))) {
  Write-Host "==> 安装 web 依赖..." -ForegroundColor Cyan
  Push-Location $Web; npm install; Pop-Location
}

# 6. Prisma
Write-Host "==> Prisma migrate + generate..." -ForegroundColor Cyan
npm exec prisma migrate deploy
npm run prisma:generate
Pop-Location

Write-Host ""
Write-Host "==> 配置完成。启动服务：" -ForegroundColor Green
Write-Host "    终端 1: npm --prefix backend run start:dev"
Write-Host "    终端 2: npm --prefix web run dev"
Write-Host ""
Write-Host "    看板: http://localhost:5173  (admin / 见 backend/.env STUDIO_PASSWORD)"
Write-Host "    API:  http://localhost:3000/health"
Write-Host "    引擎列表: http://localhost:3000/engines"
Write-Host ""
Write-Host "    引擎 Key 填入 backend/.env 后重启 backend；无 Key 时自动走 stub 模式。"
Write-Host "    详见 skillver-geo/docs/LOCAL-SETUP.md"
