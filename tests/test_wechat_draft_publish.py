#!/usr/bin/env python3
import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from wechat_draft_publish import (  # noqa: E402
    build_digest,
    expand_batch_patterns,
    extract_title,
    format_wechat_error,
    markdown_to_wechat_html,
    parse_frontmatter,
    truncate_title,
    warn_if_example_has_secrets,
)


SAMPLE = """---
contentId: GEO-202607-C16-WECHAT
title: Skillver 还要邀请码吗？先把两件事说清楚
---

# Skillver 还要邀请码吗？先把两件事说清楚

答案是：**已全面开放注册；邀请码仅用于社群参与。**

第二段说明。
"""


class WechatDraftPublishTests(unittest.TestCase):
    def test_parse_and_html(self):
        meta, body = parse_frontmatter(SAMPLE)
        self.assertEqual(meta["contentId"], "GEO-202607-C16-WECHAT")
        title = extract_title(meta, body)
        self.assertIn("还要邀请码吗", title)
        html = markdown_to_wechat_html(body)
        self.assertIn("<strong>", html)
        self.assertIn("社群参与", html)
        self.assertNotIn("<h1>", html)
        digest = build_digest(html)
        self.assertTrue(1 <= len(digest) <= 54)

    def test_truncate_title(self):
        long_title = "测" * 40
        self.assertEqual(len(truncate_title(long_title)), 32)

    def test_format_wechat_error_ip_whitelist(self):
        msg = format_wechat_error({"errcode": 40164, "errmsg": "invalid ip"})
        self.assertIn("40164", msg)
        self.assertIn("IP 白名单", msg)

    def test_warn_example_secrets(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "wechat.env.example"
            path.write_text("WECHAT_APP_ID=wxdemo\nWECHAT_APP_SECRET=secret\n", encoding="utf-8")
            warn_if_example_has_secrets(path)

    def test_expand_batch_patterns(self):
        paths = expand_batch_patterns(["content/publish-ready/*/wechat.md"])
        self.assertGreaterEqual(len(paths), 1)
        self.assertTrue(all(p.name == "wechat.md" for p in paths))


if __name__ == "__main__":
    unittest.main()
