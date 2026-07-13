import json
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTION_SET = ROOT / "baseline" / "skillver-question-set-v1.json"


class BaselineAssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(QUESTION_SET.read_text(encoding="utf-8"))

    def test_positive_has_32_traceable_questions(self):
        questions = self.payload["questions"]
        self.assertEqual(32, len(questions))
        self.assertTrue(all(item["query"] and item["passCriteria"] for item in questions))

    def test_boundary_has_balanced_categories_and_unique_ids(self):
        questions = self.payload["questions"]
        counts = Counter(item["category"] for item in questions)
        self.assertEqual({"brand": 8, "entry": 8, "term": 8, "category": 8}, dict(counts))
        self.assertEqual(32, len({item["id"] for item in questions}))

    def test_negative_rejects_non_beta_product_state(self):
        self.assertEqual("全面开放注册；邀请码仅用于赛事参与", self.payload["productState"])
        self.assertEqual("approved", self.payload["status"])


if __name__ == "__main__":
    unittest.main()
