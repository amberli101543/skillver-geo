#!/usr/bin/env python3
"""将公众号 Markdown 的「标题 + 正文」提交到微信草稿箱（不自动群发、不生成封面图）。

凭证怎么填（最重要）：
  1) cp ops/wechat.env.example .env.wechat
  2) 用编辑器打开仓库根目录的 .env.wechat
  3) 只改这两行等号右边：
       WECHAT_APP_ID=你的AppID
       WECHAT_APP_SECRET=你的AppSecret
  AppID/AppSecret 在：微信公众平台 → 设置与开发 → 基本配置

封面说明：
  本脚本不生成封面图。微信接口要求草稿有封面素材 ID。
  推荐：在公众平台素材库上传一张固定封面，把永久 media_id 写入
  .env.wechat 的 WECHAT_THUMB_MEDIA_ID=... 之后每篇只交标题+正文即可。
  也可临时用 --cover 指向你已有的 jpg/png（不是生成，只是上传已有文件）。

用法：
  python3 scripts/wechat_draft_publish.py --markdown content/publish-ready/C16/wechat.md --dry-run
  python3 scripts/wechat_draft_publish.py --markdown content/publish-ready/C16/wechat.md
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.wechat"
TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token"
MATERIAL_URL = "https://api.weixin.qq.com/cgi-bin/material/add_material"
MATERIAL_LIST_URL = "https://api.weixin.qq.com/cgi-bin/material/batchget_material"
DRAFT_ADD_URL = "https://api.weixin.qq.com/cgi-bin/draft/add"


def load_dotenv_wechat(path: Path = ENV_FILE) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return meta, parts[2].lstrip("\n")


def extract_title(meta: dict[str, str], body: str) -> str:
    if meta.get("title"):
        return meta["title"].strip()
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    raise ValueError("无法从 frontmatter 或正文提取标题")


def markdown_to_wechat_html(body: str) -> str:
    """极简 Markdown → 微信图文 HTML（当前稿件以段落/加粗为主）。"""
    lines = body.splitlines()
    html_parts: list[str] = []
    paragraph: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        text = " ".join(paragraph).strip()
        paragraph = []
        if not text:
            return
        html_parts.append(f"<p>{inline_format(text)}</p>")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            continue
        if stripped.startswith("# "):
            flush_paragraph()
            # 标题已单独传给微信 title 字段，正文里跳过一级标题避免重复
            continue
        if stripped.startswith("## "):
            flush_paragraph()
            html_parts.append(f"<h2>{inline_format(stripped[3:].strip())}</h2>")
            continue
        if stripped.startswith("### "):
            flush_paragraph()
            html_parts.append(f"<h3>{inline_format(stripped[4:].strip())}</h3>")
            continue
        if stripped.startswith("- "):
            flush_paragraph()
            html_parts.append(f"<p>· {inline_format(stripped[2:].strip())}</p>")
            continue
        paragraph.append(stripped)

    flush_paragraph()
    html = "\n".join(html_parts)
    if not html.strip():
        raise ValueError("正文为空，无法生成草稿")
    return html


def inline_format(text: str) -> str:
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    return escaped


def build_digest(html: str, limit: int = 54) -> str:
    plain = re.sub(r"<[^>]+>", "", html)
    plain = re.sub(r"\s+", "", plain)
    return plain[:limit]


def truncate_title(title: str, limit: int = 32) -> str:
    if len(title) <= limit:
        return title
    return title[: limit - 1] + "…"


def http_get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def multipart_upload(url: str, field_name: str, file_path: Path) -> dict:
    boundary = "----GeoWechatBoundary7MA4YWxkTrZu0gW"
    filename = file_path.name
    content_type = "image/jpeg"
    suffix = file_path.suffix.lower()
    if suffix == ".png":
        content_type = "image/png"
    elif suffix in {".jpg", ".jpeg"}:
        content_type = "image/jpeg"
    else:
        raise ValueError("封面仅支持 .jpg / .jpeg / .png")

    file_bytes = file_path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_access_token(app_id: str, app_secret: str) -> str:
    query = urllib.parse.urlencode(
        {
            "grant_type": "client_credential",
            "appid": app_id,
            "secret": app_secret,
        }
    )
    data = http_get_json(f"{TOKEN_URL}?{query}")
    if "access_token" not in data:
        raise RuntimeError(f"获取 access_token 失败: {data}")
    return data["access_token"]


def upload_cover(access_token: str, cover: Path) -> str:
    url = f"{MATERIAL_URL}?access_token={urllib.parse.quote(access_token)}&type=image"
    data = multipart_upload(url, "media", cover)
    media_id = data.get("media_id")
    if not media_id:
        raise RuntimeError(f"上传封面失败: {data}")
    return media_id


def list_image_materials(access_token: str, *, offset: int = 0, count: int = 20) -> dict:
    url = f"{MATERIAL_LIST_URL}?access_token={urllib.parse.quote(access_token)}"
    return http_post_json(
        url,
        {"type": "image", "offset": offset, "count": count},
    )


def add_draft(
    access_token: str,
    *,
    title: str,
    author: str,
    digest: str,
    content_html: str,
    thumb_media_id: str,
    content_source_url: str,
) -> str:
    payload = {
        "articles": [
            {
                "article_type": "news",
                "title": truncate_title(title),
                "author": author[:16],
                "digest": digest[:128],
                "content": content_html,
                "content_source_url": content_source_url,
                "thumb_media_id": thumb_media_id,
                "need_open_comment": 0,
                "only_fans_can_comment": 0,
            }
        ]
    }
    url = f"{DRAFT_ADD_URL}?access_token={urllib.parse.quote(access_token)}"
    data = http_post_json(url, payload)
    media_id = data.get("media_id")
    if not media_id:
        raise RuntimeError(f"新增草稿失败: {data}")
    return media_id


def prepare_article(markdown_path: Path) -> tuple[dict[str, str], str, str, str]:
    raw = markdown_path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(raw)
    title = extract_title(meta, body)
    html = markdown_to_wechat_html(body)
    digest = build_digest(html)
    return meta, title, html, digest


def require_credentials() -> tuple[str, str]:
    app_id = os.environ.get("WECHAT_APP_ID", "").strip()
    app_secret = os.environ.get("WECHAT_APP_SECRET", "").strip()
    if not app_id or not app_secret:
        print(
            "还没配置凭证。请按下面做：\n"
            "  1. cp ops/wechat.env.example .env.wechat\n"
            "  2. 打开仓库根目录的 .env.wechat\n"
            "  3. 填写 WECHAT_APP_ID= 和 WECHAT_APP_SECRET= 等号右边\n"
            "详见 docs/WECHAT-DRAFT-AUTOMATION.md",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return app_id, app_secret


def main(argv: list[str] | None = None) -> int:
    load_dotenv_wechat()
    parser = argparse.ArgumentParser(
        description="将公众号 Markdown 提交到微信草稿箱（不自动群发）"
    )
    parser.add_argument(
        "--markdown",
        help="例如 content/publish-ready/C16/wechat.md（与 --list-images 二选一）",
    )
    parser.add_argument(
        "--list-images",
        action="store_true",
        help="列出素材库图片及 media_id，便于填写 WECHAT_THUMB_MEDIA_ID",
    )
    parser.add_argument(
        "--cover",
        help="可选：本地已有封面 jpg/png（若已配置 WECHAT_THUMB_MEDIA_ID 可省略）",
    )
    parser.add_argument(
        "--thumb-media-id",
        default=os.environ.get("WECHAT_THUMB_MEDIA_ID", ""),
        help="可选：微信素材库已有封面的永久 media_id",
    )
    parser.add_argument(
        "--author",
        default=os.environ.get("WECHAT_AUTHOR", "Skillver"),
        help="作者名，默认 Skillver 或 WECHAT_AUTHOR",
    )
    parser.add_argument(
        "--source-url",
        default=os.environ.get("WECHAT_CONTENT_SOURCE_URL", ""),
        help="阅读原文 URL，可选",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印将提交的标题/正文 HTML，不调用微信 API",
    )
    args = parser.parse_args(argv)

    if args.list_images:
        app_id, app_secret = require_credentials()
        try:
            token = get_access_token(app_id, app_secret)
            data = list_image_materials(token)
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError) as err:
            print(f"列出素材失败: {err}", file=sys.stderr)
            return 1
        items = data.get("item") or []
        if not items:
            print("素材库暂无图片。请先在公众平台 → 素材管理 上传一张封面图，再重跑本命令。")
            return 1
        print(f"共 {data.get('total_count', len(items))} 张图片素材（本页 {len(items)}）：")
        for item in items:
            print(f"- name: {item.get('name', '')}")
            print(f"  media_id: {item.get('media_id', '')}")
            print(f"  url: {item.get('url', '')}")
        print("\n把要用的那张 media_id 填进 .env.wechat 的 WECHAT_THUMB_MEDIA_ID=")
        return 0

    if not args.markdown:
        print("请提供 --markdown，或使用 --list-images 查看封面 media_id。", file=sys.stderr)
        return 1

    md_path = Path(args.markdown)
    if not md_path.is_file():
        md_path = ROOT / args.markdown
    if not md_path.is_file():
        print(f"找不到稿件: {args.markdown}", file=sys.stderr)
        return 1

    try:
        _meta, title, html, digest = prepare_article(md_path)
    except ValueError as err:
        print(f"解析失败: {err}", file=sys.stderr)
        return 1

    print(f"title: {truncate_title(title)}")
    print(f"digest: {digest}")
    print(f"html_chars: {len(html)}")

    if args.dry_run:
        print("--- HTML preview ---")
        print(html)
        print("--- dry-run 完成（未调用微信）---")
        return 0

    app_id, app_secret = require_credentials()

    thumb_id = (args.thumb_media_id or "").strip()
    try:
        token = get_access_token(app_id, app_secret)
        if not thumb_id:
            if not args.cover:
                print(
                    "微信草稿接口需要封面素材 ID（脚本不生成封面图）。任选其一：\n"
                    "  A. 先 --list-images，再把 media_id 写入 .env.wechat 的 WECHAT_THUMB_MEDIA_ID=\n"
                    "  B. 临时加参数 --cover /你已有的图片.jpg\n"
                    "详见 docs/WECHAT-DRAFT-AUTOMATION.md",
                    file=sys.stderr,
                )
                return 1
            cover_path = Path(args.cover)
            if not cover_path.is_file():
                cover_path = ROOT / args.cover
            if not cover_path.is_file():
                print(f"找不到封面文件: {args.cover}", file=sys.stderr)
                return 1
            thumb_id = upload_cover(token, cover_path)
        media_id = add_draft(
            token,
            title=title,
            author=args.author,
            digest=digest,
            content_html=html,
            thumb_media_id=thumb_id,
            content_source_url=args.source_url,
        )
    except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, ValueError) as err:
        print(f"提交失败: {err}", file=sys.stderr)
        return 1

    print(f"draft_media_id: {media_id}")
    print("已写入草稿箱（标题+正文）。请到公众平台 → 草稿箱 预览并人工发表。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
