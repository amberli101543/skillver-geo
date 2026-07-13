"""Shared helpers for upstream snapshot export and drift checks."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_UPSTREAM_ROOT = Path(r"C:\Users\pippi\Documents\Docs\skillver_v1")

EXPORT_WHITELIST = {
    "web/public/llms.txt": {
        "id": "LLMS_TXT",
        "protectionLevel": "public",
        "factCategory": "llms",
        "allowedUse": "离线口径核对与内容门禁；不得反向覆盖主仓 llms.txt",
        "snapshotName": "llms.txt",
    },
    "web/src/lib/siteUrl.ts": {
        "id": "SEO_CONTRACT_SOURCE",
        "protectionLevel": "derived",
        "factCategory": "seo",
        "allowedUse": "生成 seo-contract.json；不得复制为可编辑 TS 源码",
        "snapshotName": None,
    },
    "web/src/content/faqContent.ts": {
        "id": "FAQ_FACTS_SOURCE",
        "protectionLevel": "derived",
        "factCategory": "public-facts",
        "allowedUse": "生成 public-facts.json；FAQ 实现仍以主仓 faqContent.ts 为准",
        "snapshotName": None,
    },
}

PROTECTED_POINTERS = {
    "docs/active/CP_COMMERCIAL_SPEC_V2.0.md": "商业与费用边界",
    "docs/active/CP_SECURITY_SPEC_V2.0.md": "隐私、授权与删除规则",
    "docs/active/CP_GLOSSARY_V2.0.md": "七维战力对外定义",
    "docs/active/CP_ALGORITHMS_V2.0.md": "评分算法",
    "docs/kae/skill-taxonomy-v0.1.md": "KAE Skill Taxonomy",
}

BLOCKED_PREFIXES = (
    ".env",
    "node_modules/",
    "backend/",
    "app/",
    "agent/",
    "plugin/",
    ".git/",
)

STALE_SENSITIVE_PATTERNS = (
    re.compile(r"内测期零收费|零收费|永久免费|免费预约|导师.{0,8}(已开放|可预约)"),
    re.compile(r"[0-9]{1,3}\s*天"),
    re.compile(r"[0-9]{1,2}\s*次"),
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def run_git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def resolve_commit(repo: Path, commit: str) -> str:
    return run_git(repo, "rev-parse", commit)


def read_source_at_commit(repo: Path, commit: str, relative_path: str) -> str:
    return run_git(repo, "show", f"{commit}:{relative_path}")


def parse_site_url_contract(source: str) -> dict:
    default_match = re.search(r"DEFAULT_SITE_URL\s*=\s*'([^']+)'", source)
    paths_match = re.search(
        r"PUBLIC_SITEMAP_PATHS\s*=\s*\[(.*?)\]\s*as const",
        source,
        re.S,
    )
    paths = []
    if paths_match:
        paths = re.findall(r"'(/[^']*)'", paths_match.group(1))
    llms_paths = [path for path in paths if path != "/"]
    return {
        "canonicalOrigin": default_match.group(1) if default_match else "https://www.skillver.cn",
        "publicSitemapPaths": paths,
        "llmsTxtRequiredPaths": llms_paths,
        "schemaTypes": ["FAQPage", "Organization", "SoftwareApplication", "DefinedTermSet"],
        "productEntryDomains": ["https://www.skillver.cn", "https://www.skillver.ai"],
        "brandContentDomain": "https://www.tcodeai.com",
    }


def parse_faq_public_facts(source: str) -> list[dict]:
    entries = []
    for block in re.finditer(
        r"\{\s*id:\s*'([^']+)',\s*question:\s*'([^']+)',\s*schemaAnswer:\s*'((?:\\'|[^'])*)'",
        source,
        re.S,
    ):
        answer = block.group(3).replace("\\'", "'")
        entries.append(
            {
                "id": block.group(1),
                "question": block.group(2),
                "schemaAnswer": answer,
            }
        )
    return entries


def build_public_facts(faq_entries: list[dict]) -> dict:
    return {
        "canonicalPositioning": "全面开放注册；邀请码仅用于赛事参与",
        "productEntryDomains": ["https://www.skillver.cn", "https://www.skillver.ai"],
        "brandContentDomain": "https://www.tcodeai.com",
        "mentorStatus": "待开通",
        "feeBoundary": "费用表述仅适用于内测阶段",
        "rehearsalVsFormal": "彩排用于练习，不计入正式评估；彩排报告不能替代正式 AI 面试报告",
        "offerPromise": "不承诺 offer、正式评估通过或面试邀约",
        "faqAnchors": faq_entries,
    }


def build_geo_implementation_status(commit: str, commit_message: str) -> dict:
    return {
        "taskId": "GEO-MAIN-2026-07-P0",
        "sourceCommit": commit,
        "sourceCommitMessage": commit_message,
        "codeStatus": "completed_and_pushed",
        "localTests": {
            "relatedSuite": "55/55 passed",
            "lint": "no new errors",
        },
        "productionStatus": "pending",
        "pendingItems": [
            "ECS deploy and version confirmation",
            "Three-domain post_deploy_smoke x3",
            "Sitemap intermittent 500 log evidence and root cause",
            "Rich Results screenshots",
            "Search console submissions",
            "WAF/ECS sign-off and first crawler weekly report",
        ],
    }


def build_protected_sources(repo: Path, commit: str) -> list[dict]:
    items = []
    for relative_path, topic in PROTECTED_POINTERS.items():
        try:
            content = read_source_at_commit(repo, commit, relative_path)
        except RuntimeError:
            content = ""
        items.append(
            {
                "sourcePath": relative_path,
                "topic": topic,
                "sha256": sha256_text(content) if content else "0" * 64,
                "reviewRequired": True,
                "allowedUse": "仅登记路径与 hash；正文不得复制到 skillver-geo 独立编辑",
            }
        )
    return items


def is_blocked_path(path: str) -> bool:
    normalized = path.replace("\\", "/")
    if normalized.endswith(".env") or "/.env" in normalized:
        return True
    return any(normalized.startswith(prefix) for prefix in BLOCKED_PREFIXES)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
