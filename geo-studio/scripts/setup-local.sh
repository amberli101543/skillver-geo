#!/usr/bin/env bash
# GEO Studio 本地环境一键配置（macOS / Linux）
# 用法：在 geo-studio 根目录执行
#   bash ./scripts/setup-local.sh
# 或任意目录：
#   bash "/path/to/geo-studio/scripts/setup-local.sh"

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
WEB="$ROOT/web"

echo "==> GEO Studio 本地环境配置"
echo "    根目录: $ROOT"

# 1. 检查 Node
if ! command -v node >/dev/null 2>&1; then
  echo "错误: 未找到 Node.js。请先安装 Node 20+。" >&2
  exit 1
fi
echo "    Node: $(node -v)"
echo "    npm:  $(npm -v)"

# 2. 检查 Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "错误: 未找到 docker。请先安装并启动 Docker Desktop。" >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "错误: Docker 未运行。请先启动 Docker Desktop，再重试。" >&2
  exit 1
fi
echo "    Docker: OK"

# 3. 复制 .env（若不存在）
if [[ ! -f "$BACKEND/.env" ]]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "    已创建 backend/.env（从 .env.example 复制）"
else
  echo "    backend/.env 已存在，跳过复制"
fi

# 4. 启动数据库（PostgreSQL 5433 + Redis 6379）
echo "==> 启动 PostgreSQL + Redis..."
cd "$BACKEND"
if ! docker compose up -d; then
  echo "" >&2
  echo "错误: docker compose 启动失败（常见原因：拉镜像 TLS 超时）。" >&2
  echo "请先配置 Docker registry-mirrors，或手动执行：" >&2
  echo "  docker pull redis:7-alpine" >&2
  echo "  docker pull pgvector/pgvector:pg16" >&2
  echo "成功后再重新运行本脚本。" >&2
  exit 1
fi

# 等待 Postgres 可连接（最多约 60 秒）
echo "==> 等待 Postgres 就绪..."
for i in $(seq 1 30); do
  if docker exec geo-studio-postgres pg_isready -U geo -d geo_studio >/dev/null 2>&1; then
    echo "    Postgres: ready"
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "错误: Postgres 未在 60s 内就绪。请检查: docker ps -a" >&2
    exit 1
  fi
  sleep 2
done

# 5. 安装依赖（若 node_modules 缺失）
if [[ ! -d "$BACKEND/node_modules" ]]; then
  echo "==> 安装 backend 依赖..."
  npm install
fi
if [[ ! -d "$WEB/node_modules" ]]; then
  echo "==> 安装 web 依赖..."
  (cd "$WEB" && npm install)
fi

# 6. Prisma
echo "==> Prisma migrate + generate..."
npm exec prisma migrate deploy
npm run prisma:generate

echo ""
echo "==> 配置完成。请开两个终端启动服务："
echo "    cd \"$ROOT\""
echo "    终端 1: npm --prefix backend run start:dev"
echo "    终端 2: npm --prefix web run dev"
echo ""
echo "    看板: http://localhost:5173  (admin / 见 backend/.env STUDIO_PASSWORD)"
echo "    API:  http://localhost:3000/health"
echo "    引擎: http://localhost:3000/engines"
echo ""
echo "    引擎 Key 填入 backend/.env 后重启 backend；无 Key 时走 stub。"
echo "    详见 docs/LOCAL-SETUP.md"
