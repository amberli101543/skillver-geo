#!/usr/bin/env bash
# 本机试跑：dry-run → list-images 提示 → 上传 C13 公众号稿到草稿箱
# 用法：bash scripts/smoke-wechat-draft.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.wechat ]]; then
  echo "缺少 .env.wechat。请: cp ops/wechat.env.example .env.wechat 并填写密钥"
  exit 1
fi

echo "==> dry-run C13"
python3 scripts/wechat_draft_publish.py --markdown content/publish-ready/C13/wechat.md --dry-run

echo ""
echo "==> list-images（若为空请先在素材库上传封面，并把 media_id 写入 .env.wechat）"
python3 scripts/wechat_draft_publish.py --list-images

if ! grep -qE '^WECHAT_THUMB_MEDIA_ID=.+' .env.wechat; then
  echo ""
  echo "尚未配置 WECHAT_THUMB_MEDIA_ID，跳过正式上传。"
  echo "填好后重新运行本脚本，或执行："
  echo "  python3 scripts/wechat_draft_publish.py --markdown content/publish-ready/C13/wechat.md"
  exit 0
fi

echo ""
echo "==> 正式写入草稿箱 C13"
python3 scripts/wechat_draft_publish.py --markdown content/publish-ready/C13/wechat.md
echo "请到微信公众平台 → 草稿箱 核对。"
