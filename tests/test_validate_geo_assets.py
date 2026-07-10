import copy
import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from validate_geo_assets import (
    EXPECTED_CHANNELS,
    validate_channel_manifest,
    validate_matrix_file,
    validate_publish_log,
    validate_repository,
)


MATRIX_SCHEMA = ROOT / "schemas" / "skillver-16-cells.schema.json"
PUBLISH_SCHEMA = ROOT / "schemas" / "publish-log.schema.json"
CHANNEL_SCHEMA = ROOT / "schemas" / "channel-content.schema.json"
CHANNEL_CODES = {
    "tcodeai": "TCODEAI",
    "main-faq": "MAIN-FAQ",
    "wechat": "WECHAT",
    "xiaohongshu": "XHS",
    "zhihu": "ZHIHU",
}


def valid_cells():
    stages = (
        "认知期",
        "选型对比期",
        "使用场景期",
        "信任顾虑期",
    )
    angles = ("定义解释", "对比评测", "操作指南", "案例/数据")
    return [
        {
            "cellId": f"C{number:02d}",
            "lifecycleStage": stages[(number - 1) // 4],
            "contentAngle": angles[(number - 1) % 4],
            "topic": f"测试主题 {number}",
            "sourceRefs": ["01-strategy/GEO-语义及切片、发布平台、排期.md"],
            "publicationStatus": "待产出",
        }
        for number in range(1, 17)
    ]


def valid_matrix():
    return {
        "schemaVersion": "1.0.0",
        "sourceDocuments": [
            "01-strategy/GEO-语义及切片、发布平台、排期.md"
        ],
        "cells": valid_cells(),
    }


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")


def write_log(path, rows):
    columns = [
        "recordId",
        "contentId",
        "cellId",
        "channel",
        "title",
        "url",
        "status",
        "publishedAt",
        "verifiedAt",
        "sourceRef",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def valid_channel_manifest(root):
    items = []
    for cell_id, channels in EXPECTED_CHANNELS.items():
        for channel in sorted(channels):
            relative_md = f"content/publish-ready/{cell_id}/{channel}.md"
            relative_html = (
                f"content/publish-ready/{cell_id}/cms/{channel}.html"
                if channel in {"tcodeai", "main-faq"}
                else None
            )
            item = {
                "contentId": f"GEO-202607-{cell_id}-{CHANNEL_CODES[channel]}",
                "cellId": cell_id,
                "channel": channel,
                "title": f"{cell_id} {channel} 测试标题",
                "status": "approved",
                "sourceMaster": f"content/{cell_id}-测试母稿.md",
                "scheduledAt": "2026-07-13",
                "markdownPath": relative_md,
                "cmsHtmlPath": relative_html,
            }
            markdown_path = root / relative_md
            markdown_path.parent.mkdir(parents=True, exist_ok=True)
            frontmatter = "\n".join(
                f"{field}: {item[field]}"
                for field in (
                    "contentId",
                    "cellId",
                    "channel",
                    "title",
                    "status",
                    "sourceMaster",
                    "scheduledAt",
                )
            )
            markdown_path.write_text(
                f"---\n{frontmatter}\n---\n\n# {item['title']}\n",
                encoding="utf-8",
            )
            if relative_html:
                html_path = root / relative_html
                html_path.parent.mkdir(parents=True, exist_ok=True)
                html = (
                    "<article><h1>测试文章</h1><p>正文</p></article>"
                    if channel == "tcodeai"
                    else (
                        '<section data-content-type="faq">'
                        "<details><summary>问题</summary><p>回答</p></details></section>"
                    )
                )
                html_path.write_text(html, encoding="utf-8")
            items.append(item)
    return {"schemaVersion": "1.0.0", "items": items}


class GeoAssetValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.root = Path(self.temp_dir.name)

    def test_positive_valid_matrix_and_publish_log(self):
        matrix_path = self.root / "matrix.json"
        log_path = self.root / "publish-log.csv"
        write_json(matrix_path, valid_matrix())
        write_log(
            log_path,
            [
                {
                    "recordId": "PUB-0001",
                    "contentId": "G9",
                    "cellId": "C09",
                    "channel": "微信公众号",
                    "title": "LinkedIn 看标签 vs Skillver 看七维战力",
                    "url": "https://mp.weixin.qq.com/s/B5_KOfNyBlb8_5G4PC6CSw",
                    "status": "已发布",
                    "publishedAt": "",
                    "verifiedAt": "2026-06-27",
                    "sourceRef": "01-strategy/GEO-语义及切片、发布平台、排期.md#已发（仅-1-篇）",
                }
            ],
        )

        self.assertEqual(
            [], validate_matrix_file(matrix_path, MATRIX_SCHEMA)
        )
        self.assertEqual(
            [], validate_publish_log(log_path, PUBLISH_SCHEMA)
        )

    def test_boundary_accepts_c01_and_c16(self):
        matrix = valid_matrix()
        self.assertEqual("C01", matrix["cells"][0]["cellId"])
        self.assertEqual("C16", matrix["cells"][-1]["cellId"])
        matrix_path = self.root / "matrix.json"
        write_json(matrix_path, matrix)

        self.assertEqual(
            [], validate_matrix_file(matrix_path, MATRIX_SCHEMA)
        )

    def test_positive_validates_upstream_and_content_assets(self):
        errors = validate_repository(ROOT)
        self.assertEqual([], errors)

    def test_negative_rejects_missing_required_out_of_range_and_banned_claim(self):
        matrix = valid_matrix()
        del matrix["cells"][0]["topic"]
        matrix["cells"][1]["cellId"] = "C17"
        matrix["cells"][2]["topic"] = "开放注册，保证offer"
        matrix_path = self.root / "matrix.json"
        write_json(matrix_path, matrix)

        errors = validate_matrix_file(matrix_path, MATRIX_SCHEMA)

        self.assertTrue(any("topic" in error for error in errors))
        self.assertTrue(any("C17" in error or "cellId" in error for error in errors))
        self.assertTrue(any("开放注册" in error for error in errors))
        self.assertTrue(any("保证offer" in error for error in errors))

    def test_negative_rejects_duplicate_url_and_invalid_log_cell(self):
        log_path = self.root / "publish-log.csv"
        row = {
            "recordId": "PUB-0001",
            "contentId": "G9",
            "cellId": "C17",
            "channel": "微信公众号",
            "title": "测试",
            "url": "https://mp.weixin.qq.com/s/example",
            "status": "已发布",
            "publishedAt": "",
            "verifiedAt": "2026-06-27",
            "sourceRef": "01-strategy/source.md",
        }
        write_log(log_path, [row, copy.deepcopy(row)])

        errors = validate_publish_log(log_path, PUBLISH_SCHEMA)

        self.assertTrue(any("cellId" in error for error in errors))
        self.assertTrue(any("重复" in error for error in errors))

    def test_positive_accepts_24_channel_assets_and_10_html_fragments(self):
        manifest = valid_channel_manifest(self.root)
        manifest_path = self.root / "manifest.json"
        write_json(manifest_path, manifest)

        errors = validate_channel_manifest(manifest_path, CHANNEL_SCHEMA, self.root)

        self.assertEqual([], errors)
        self.assertEqual(24, len(manifest["items"]))
        self.assertEqual(10, sum(bool(item["cmsHtmlPath"]) for item in manifest["items"]))

    def test_boundary_c16_has_no_zhihu_asset(self):
        manifest = valid_channel_manifest(self.root)
        c16_channels = {
            item["channel"] for item in manifest["items"] if item["cellId"] == "C16"
        }

        self.assertEqual(
            {"tcodeai", "main-faq", "wechat", "xiaohongshu"},
            c16_channels,
        )

    def test_negative_rejects_missing_file_banned_claim_and_html_shell(self):
        manifest = valid_channel_manifest(self.root)
        first = manifest["items"][0]
        (self.root / first["markdownPath"]).write_text(
            (self.root / first["markdownPath"]).read_text(encoding="utf-8")
            + "\n开放注册\n",
            encoding="utf-8",
        )
        html_item = next(item for item in manifest["items"] if item["channel"] == "tcodeai")
        (self.root / html_item["cmsHtmlPath"]).write_text(
            "<html><script></script><article><p>缺少标题</p></article></html>",
            encoding="utf-8",
        )
        missing = manifest["items"][-1]
        (self.root / missing["markdownPath"]).unlink()
        manifest_path = self.root / "manifest.json"
        write_json(manifest_path, manifest)

        errors = validate_channel_manifest(manifest_path, CHANNEL_SCHEMA, self.root)

        self.assertTrue(any("开放注册" in error for error in errors))
        self.assertTrue(any("文件不存在" in error for error in errors))
        self.assertTrue(any("<html>" in error for error in errors))
        self.assertTrue(any("<script>" in error for error in errors))
        self.assertTrue(any("H1" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
