#!/usr/bin/env bash
# 从国内镜像源拉取 GEO Studio 依赖镜像，再打回官方 tag（绕过 Docker Hub 超时）
# 用法：
#   bash ./scripts/pull-images-cn.sh
# 成功后再：
#   bash ./scripts/setup-local.sh
#   或 npm --prefix backend run db:up

set -euo pipefail

ARCH="$(uname -m)"
echo "==> 本机架构: $ARCH"

if ! command -v docker >/dev/null 2>&1; then
  echo "错误: 未找到 docker。" >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "错误: Docker 未运行。请先启动 Docker Desktop。" >&2
  exit 1
fi

# 华为云 SWR 同步的 docker.io 缓存（国内通常比 Hub 更稳）
REDIS_MIRROR="swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/redis:7-alpine"
if [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]]; then
  PG_MIRROR="swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/pgvector/pgvector:pg16-linuxarm64"
else
  PG_MIRROR="swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/pgvector/pgvector:pg16"
fi

echo "==> 拉取 Redis..."
docker pull "$REDIS_MIRROR"
docker tag "$REDIS_MIRROR" redis:7-alpine

echo "==> 拉取 pgvector (PostgreSQL 16)..."
docker pull "$PG_MIRROR"
docker tag "$PG_MIRROR" pgvector/pgvector:pg16

echo ""
echo "==> 完成。本地已有："
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' | grep -E 'REPOSITORY|redis|pgvector' || true
echo ""
echo "下一步："
echo "  bash ./scripts/setup-local.sh"
echo "或："
echo "  npm --prefix backend run db:up"
