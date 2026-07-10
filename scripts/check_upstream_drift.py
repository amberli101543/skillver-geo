#!/usr/bin/env python3
"""Check drift between pinned upstream snapshot and live skillver_v1 repository."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from upstream_common import (
    DEFAULT_UPSTREAM_ROOT,
    PROTECTED_POINTERS,
    ROOT,
    STALE_SENSITIVE_PATTERNS,
    parse_faq_public_facts,
    parse_site_url_contract,
    read_source_at_commit,
    resolve_commit,
    run_git,
    sha256_text,
)


def load_manifest() -> dict:
    path = ROOT / "upstream" / "skillver_v1" / "manifest.json"
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_current_ref(repo: Path) -> str:
    for ref in ("origin/main", "HEAD"):
        try:
            return resolve_commit(repo, ref)
        except RuntimeError:
            continue
    raise RuntimeError("cannot resolve current git ref")


def is_ancestor(repo: Path, ancestor: str, descendant: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", ancestor, descendant],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def verify_snapshot_integrity(repo: Path, manifest: dict) -> list[str]:
    pinned = manifest["sourceCommit"]
    findings = []
    for item in manifest["items"]:
        source_path = item["sourcePath"]
        if source_path.startswith("handoffs/"):
            continue
        if "|" in source_path:
            protected = json.loads((ROOT / item["snapshotPath"]).read_text(encoding="utf-8"))
            for entry in protected["items"]:
                path = entry["sourcePath"]
                try:
                    live = read_source_at_commit(repo, pinned, path)
                except RuntimeError:
                    findings.append(f"{path}: pinned commit 无法读取")
                    continue
                if sha256_text(live) != entry["sha256"]:
                    findings.append(f"{path}: 快照与 pinned commit 不一致")
            continue
        try:
            live = read_source_at_commit(repo, pinned, source_path)
        except RuntimeError:
            findings.append(f"{source_path}: pinned commit 无法读取")
            continue
        if item["id"] == "LLMS_TXT" and sha256_text(live) != item["sha256"]:
            findings.append(f"{source_path}: llms.txt 快照 hash 不匹配")
    return findings


def compare_whitelist_drift(repo: Path, pinned: str, current: str) -> list[str]:
    if pinned == current:
        return []
    findings = []
    pairs = [
        ("web/public/llms.txt", "llms.txt"),
        ("web/src/lib/siteUrl.ts", "seo"),
        ("web/src/content/faqContent.ts", "faq"),
    ]
    for source_path, label in pairs:
        try:
            pinned_text = read_source_at_commit(repo, pinned, source_path)
            current_text = read_source_at_commit(repo, current, source_path)
        except RuntimeError:
            findings.append(f"{source_path}: 无法在 pinned/current 读取")
            continue
        if sha256_text(pinned_text) == sha256_text(current_text):
            continue
        if label == "seo":
            pinned_contract = parse_site_url_contract(pinned_text)
            current_contract = parse_site_url_contract(current_text)
            for key in ("canonicalOrigin", "publicSitemapPaths", "llmsTxtRequiredPaths"):
                if pinned_contract.get(key) != current_contract.get(key):
                    findings.append(f"{source_path}: seo 契约字段 {key} 已漂移")
        elif label == "faq":
            pinned_entries = {entry["id"]: entry for entry in parse_faq_public_facts(pinned_text)}
            current_entries = {entry["id"]: entry for entry in parse_faq_public_facts(current_text)}
            for faq_id in sorted(set(pinned_entries) | set(current_entries)):
                if faq_id not in current_entries:
                    findings.append(f"faq {faq_id}: 主仓 current 已删除")
                elif faq_id not in pinned_entries:
                    findings.append(f"faq {faq_id}: 主仓 current 新增")
                elif (
                    current_entries[faq_id]["schemaAnswer"]
                    != pinned_entries[faq_id]["schemaAnswer"]
                ):
                    findings.append(f"faq {faq_id}: schemaAnswer 已变化")
        else:
            findings.append(f"{source_path}: 内容 hash 已变化")
    for path in PROTECTED_POINTERS:
        try:
            pinned_hash = sha256_text(read_source_at_commit(repo, pinned, path))
            current_hash = sha256_text(read_source_at_commit(repo, current, path))
        except RuntimeError:
            findings.append(f"{path}: 受保护文件无法读取")
            continue
        if pinned_hash != current_hash:
            findings.append(f"{path}: 受保护源文件 hash 已变化")
    return findings


def check_sensitive_claims(text: str, stale: bool) -> list[str]:
    if not stale:
        return []
    for pattern in STALE_SENSITIVE_PATTERNS:
        if pattern.search(text):
            return ["快照已 stale，检测到费用/次数/导师/期限类新增表述，需回主仓复核后再写入"]
    return []


def check_drift(repo: Path, manifest: dict) -> dict:
    pinned = manifest["sourceCommit"]
    current = resolve_current_ref(repo)
    findings = verify_snapshot_integrity(repo, manifest)

    local_head = resolve_commit(repo, "HEAD")
    if not is_ancestor(repo, pinned, local_head) and not is_ancestor(repo, local_head, pinned):
        if local_head != pinned:
            findings.append(
                f"local HEAD {local_head[:12]} 与 pinned {pinned[:12]} 无直系祖先关系，优先以 origin/main 判漂移"
            )

    findings.extend(compare_whitelist_drift(repo, pinned, current))
    stale = pinned != current or bool(findings)
    return {
        "pinnedCommit": pinned,
        "currentRef": current,
        "localHead": local_head,
        "stale": stale,
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Check upstream snapshot drift")
    parser.add_argument("--repo", type=Path, default=DEFAULT_UPSTREAM_ROOT)
    parser.add_argument("--check-file", type=Path, help="Optional file to scan for stale-sensitive claims")
    args = parser.parse_args()

    manifest = load_manifest()
    if not args.repo.exists():
        report = {
            "pinnedCommit": manifest["sourceCommit"],
            "currentRef": None,
            "localHead": None,
            "stale": True,
            "findings": ["upstream repo unavailable"],
        }
    else:
        report = check_drift(args.repo.resolve(), manifest)

    if args.check_file:
        if args.check_file.exists():
            report["findings"].extend(
                check_sensitive_claims(
                    args.check_file.read_text(encoding="utf-8"),
                    report["stale"],
                )
            )
        else:
            report["findings"].append(f"check file missing: {args.check_file}")

    for finding in report["findings"]:
        print(f"{'WARN' if report['stale'] else 'INFO'} {finding}")

    if report["stale"]:
        current = report.get("currentRef") or "unavailable"
        print(f"STALE pinned={report['pinnedCommit'][:12]} current={str(current)[:12]}")
        return 2 if report["findings"] else 0

    print(f"OK: upstream snapshot aligned with {report['currentRef'][:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
