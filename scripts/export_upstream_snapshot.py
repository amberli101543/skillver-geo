#!/usr/bin/env python3
"""Export a portable readonly snapshot from skillver_v1 at a pinned commit."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from upstream_common import (
    DEFAULT_UPSTREAM_ROOT,
    EXPORT_WHITELIST,
    PROTECTED_POINTERS,
    ROOT,
    build_geo_implementation_status,
    build_protected_sources,
    build_public_facts,
    is_blocked_path,
    parse_faq_public_facts,
    parse_site_url_contract,
    read_source_at_commit,
    resolve_commit,
    run_git,
    sha256_text,
    utc_now_iso,
    write_json,
)


def export_snapshot(repo: Path, commit: str) -> dict:
    resolved = resolve_commit(repo, commit)
    commit_message = run_git(repo, "log", "-1", "--pretty=%s", resolved)
    snapshot_dir = ROOT / "upstream" / "skillver_v1" / "snapshots" / resolved[:12]
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    items = []
    llms_source = read_source_at_commit(repo, resolved, "web/public/llms.txt")
    llms_path = snapshot_dir / "llms.txt"
    llms_path.write_text(llms_source, encoding="utf-8")
    items.append(
        {
            "id": "LLMS_TXT",
            "sourcePath": "web/public/llms.txt",
            "snapshotPath": str(llms_path.relative_to(ROOT)).replace("\\", "/"),
            "protectionLevel": "public",
            "factCategory": "llms",
            "allowedUse": EXPORT_WHITELIST["web/public/llms.txt"]["allowedUse"],
            "sha256": sha256_text(llms_source),
            "reviewRequired": False,
        }
    )

    site_url_source = read_source_at_commit(repo, resolved, "web/src/lib/siteUrl.ts")
    seo_contract = parse_site_url_contract(site_url_source)
    seo_contract["sourceCommit"] = resolved
    seo_contract_path = snapshot_dir / "seo-contract.json"
    write_json(seo_contract_path, seo_contract)
    items.append(
        {
            "id": "SEO_CONTRACT",
            "sourcePath": "web/src/lib/siteUrl.ts",
            "snapshotPath": str(seo_contract_path.relative_to(ROOT)).replace("\\", "/"),
            "protectionLevel": "derived",
            "factCategory": "seo",
            "allowedUse": EXPORT_WHITELIST["web/src/lib/siteUrl.ts"]["allowedUse"],
            "sha256": sha256_text(json.dumps(seo_contract, ensure_ascii=False, sort_keys=True)),
            "reviewRequired": False,
        }
    )

    faq_source = read_source_at_commit(repo, resolved, "web/src/content/faqContent.ts")
    faq_entries = parse_faq_public_facts(faq_source)
    public_facts = build_public_facts(faq_entries)
    public_facts["sourceCommit"] = resolved
    public_facts_path = snapshot_dir / "public-facts.json"
    write_json(public_facts_path, public_facts)
    items.append(
        {
            "id": "PUBLIC_FACTS",
            "sourcePath": "web/src/content/faqContent.ts",
            "snapshotPath": str(public_facts_path.relative_to(ROOT)).replace("\\", "/"),
            "protectionLevel": "derived",
            "factCategory": "public-facts",
            "allowedUse": EXPORT_WHITELIST["web/src/content/faqContent.ts"]["allowedUse"],
            "sha256": sha256_text(json.dumps(public_facts, ensure_ascii=False, sort_keys=True)),
            "reviewRequired": False,
        }
    )

    implementation_status = build_geo_implementation_status(resolved, commit_message)
    implementation_path = snapshot_dir / "geo-implementation-status.json"
    write_json(implementation_path, implementation_status)
    items.append(
        {
            "id": "GEO_IMPLEMENTATION_STATUS",
            "sourcePath": "handoffs/SKILLVER-MAIN-REPO-GEO-DEVELOPMENT-2026-07.md",
            "snapshotPath": str(implementation_path.relative_to(ROOT)).replace("\\", "/"),
            "protectionLevel": "derived",
            "factCategory": "implementation-status",
            "allowedUse": "记录代码完成与生产待验状态；生产回传后需重新导出",
            "sha256": sha256_text(json.dumps(implementation_status, ensure_ascii=False, sort_keys=True)),
            "reviewRequired": False,
        }
    )

    protected_sources = {
        "sourceCommit": resolved,
        "items": build_protected_sources(repo, resolved),
    }
    protected_path = snapshot_dir / "protected-sources.json"
    write_json(protected_path, protected_sources)
    items.append(
        {
            "id": "PROTECTED_SOURCES",
            "sourcePath": "|".join(PROTECTED_POINTERS.keys()),
            "snapshotPath": str(protected_path.relative_to(ROOT)).replace("\\", "/"),
            "protectionLevel": "protected-metadata",
            "factCategory": "protected-pointer",
            "allowedUse": "仅保存路径、hash 与复核要求；禁止复制受保护正文到 skillver-geo",
            "sha256": sha256_text(json.dumps(protected_sources, ensure_ascii=False, sort_keys=True)),
            "reviewRequired": True,
        }
    )

    manifest = {
        "schemaVersion": "1.0.0",
        "repository": "skillver_v1",
        "repositoryStatus": "pinned",
        "sourceCommit": resolved,
        "sourceCommitMessage": commit_message,
        "generatedAt": utc_now_iso(),
        "snapshotDir": str(snapshot_dir.relative_to(ROOT)).replace("\\", "/"),
        "upstreamRoot": str(repo),
        "items": items,
    }
    write_json(ROOT / "upstream" / "skillver_v1" / "manifest.json", manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Export skillver_v1 upstream snapshot")
    parser.add_argument("--repo", type=Path, default=DEFAULT_UPSTREAM_ROOT)
    parser.add_argument("--commit", default="ca69dc9a")
    args = parser.parse_args()

    if not args.repo.exists():
        print(f"ERROR upstream repo not found: {args.repo}")
        return 1

    try:
        manifest = export_snapshot(args.repo.resolve(), args.commit)
    except RuntimeError as exc:
        print(f"ERROR {exc}")
        return 1

    print(
        "OK: exported upstream snapshot "
        f"{manifest['sourceCommit'][:12]} with {len(manifest['items'])} items"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
