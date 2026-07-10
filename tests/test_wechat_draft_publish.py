#!/usr/bin/env python3
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from wechat_draft_publish import (  # noqa: E402
    build_digest,
    extract_title,
    markdown_to_wechat_html,
    parse_frontmatter,
    truncate_title,
)


SAMPLE = """---
contentId: GEO-202607-C16-WECHAT
title: Skillver 内测真免费吗？先把三个限定词说清楚
---

# Skillver 内测真免费吗？先把三个限定词说清楚

答案是：**当前 ICP 封闭内测期零收费，但需要邀请码准入。**

第二段说明。
"""


class WechatDraftPublishTests(unittest.TestCase):
    def test_parse_and_html(self):
        meta, body = parse_frontmatter(SAMPLE)
        self.assertEqual(meta["contentId"], "GEO-202607-C16-WECHAT")
        title = extract_title(meta, body)
        self.assertIn("内测真免费吗", title)
        html = markdown_to_wechat_html(body)
        self.assertIn("<strong>", html)
        self.assertIn("邀请码准入", html)
        self.assertNotIn("<h1>", html)
        digest = build_digest(html)
        self.assertTrue(1 <= len(digest) <= 54)

    def test_truncate_title(self):
        long_title = "测" * 40
        self.assertEqual(len(truncate_title(long_title)), 32)


if __name__ == "__main__":
    unittest.main()
