import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from export_upstream_snapshot import export_snapshot
from check_upstream_drift import check_drift, check_sensitive_claims, verify_snapshot_integrity
from upstream_common import (
    BLOCKED_PREFIXES,
    build_public_facts,
    is_blocked_path,
    parse_faq_public_facts,
    parse_site_url_contract,
    sha256_text,
)

UPSTREAM_SCHEMA = ROOT / "schemas" / "upstream-snapshot.schema.json"
DEFAULT_REPO = Path(r"C:\Users\pippi\Documents\Docs\skillver_v1")


class UpstreamSnapshotTests(unittest.TestCase):
    def test_positive_export_manifest_and_snapshot_files(self):
        if not DEFAULT_REPO.exists():
            self.skipTest("skillver_v1 repo unavailable")
        manifest = export_snapshot(DEFAULT_REPO, "ca69dc9a")
        self.assertEqual("skillver_v1", manifest["repository"])
        self.assertEqual(5, len(manifest["items"]))
        snapshot_dir = ROOT / manifest["snapshotDir"]
        for name in (
            "llms.txt",
            "seo-contract.json",
            "public-facts.json",
            "geo-implementation-status.json",
            "protected-sources.json",
        ):
            self.assertTrue((snapshot_dir / name).is_file(), name)

    def test_boundary_parses_site_url_and_faq_entries(self):
        site_source = "const DEFAULT_SITE_URL = 'https://www.skillver.cn';\n"
        site_source += "export const PUBLIC_SITEMAP_PATHS = ['/','/faq'] as const;"
        contract = parse_site_url_contract(site_source)
        self.assertEqual("https://www.skillver.cn", contract["canonicalOrigin"])
        self.assertEqual(["/", "/faq"], contract["publicSitemapPaths"])

        faq_source = (
            "{ id: 'C16', question: '如何加入内测？', schemaAnswer: '需邀请码准入。', sections: [] },"
        )
        entries = parse_faq_public_facts(faq_source)
        self.assertEqual("C16", entries[0]["id"])
        facts = build_public_facts(entries)
        self.assertEqual("待开通", facts["mentorStatus"])

    def test_negative_blocks_secrets_and_unknown_paths(self):
        self.assertTrue(is_blocked_path(".env"))
        self.assertTrue(is_blocked_path("backend/src/main.ts"))
        self.assertFalse(is_blocked_path("web/public/llms.txt"))
        for prefix in BLOCKED_PREFIXES:
            self.assertTrue(is_blocked_path(prefix + "foo"))

    def test_negative_marks_stale_sensitive_claims(self):
        findings = check_sensitive_claims("内测期零收费，导师已开放可预约", True)
        self.assertTrue(findings)
        self.assertEqual([], check_sensitive_claims("封闭内测、邀请码准入", False))


class UpstreamDriftTests(unittest.TestCase):
    def test_drift_snapshot_integrity_passes_after_export(self):
        manifest_path = ROOT / "upstream" / "skillver_v1" / "manifest.json"
        if not manifest_path.is_file() or not DEFAULT_REPO.exists():
            self.skipTest("snapshot manifest unavailable")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        findings = verify_snapshot_integrity(DEFAULT_REPO, manifest)
        self.assertEqual([], findings)

    def test_drift_marks_newer_origin_main_as_stale(self):
        manifest_path = ROOT / "upstream" / "skillver_v1" / "manifest.json"
        if not manifest_path.is_file() or not DEFAULT_REPO.exists():
            self.skipTest("snapshot manifest unavailable")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        report = check_drift(DEFAULT_REPO, manifest)
        if report["currentRef"] != manifest["sourceCommit"]:
            self.assertTrue(report["stale"])


if __name__ == "__main__":
    unittest.main()
