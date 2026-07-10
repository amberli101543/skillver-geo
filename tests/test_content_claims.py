import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / "docs" / "content-claims.json"
SCRIPT_PATH = ROOT / "scripts" / "check_content_claims.py"
FIXTURES = ROOT / "tests" / "fixtures" / "content-claims"


def load_checker():
    spec = importlib.util.spec_from_file_location("content_claims", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ContentClaimsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.checker = load_checker()
        cls.policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))

    def scan_fixture(self, name):
        path = FIXTURES / name
        return self.checker.scan_file(path, self.policy)

    def test_policy_matches_schema_contract(self):
        errors = self.checker.validate_policy(self.policy)
        self.assertEqual([], errors)

    def test_allowed_copy_has_no_findings(self):
        findings = self.scan_fixture("allowed.md")
        self.assertEqual([], findings)

    def test_prohibited_copy_fails(self):
        findings = self.scan_fixture("prohibited.md")
        levels = [finding["level"] for finding in findings]
        self.assertEqual(["error", "error"], levels)

    def test_unverified_copy_warns_without_error(self):
        findings = self.scan_fixture("pending.md")
        levels = [finding["level"] for finding in findings]
        self.assertIn("warning", levels)
        self.assertNotIn("error", levels)


if __name__ == "__main__":
    unittest.main()
