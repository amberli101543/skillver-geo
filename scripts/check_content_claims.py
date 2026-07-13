#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path


TEXT_SUFFIXES = {".md", ".txt"}
LEVELS = (
    ("prohibitedClaims", "error"),
    ("pendingVerificationClaims", "warning"),
)


def validate_claim_list(name, claims):
    errors = []
    if not isinstance(claims, list):
        return [f"{name} must be an array"]
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            errors.append(f"{name}[{index}] must be an object")
            continue
        for key in ("id", "description", "patterns"):
            if not claim.get(key):
                errors.append(f"{name}[{index}].{key} is required")
    return errors


def validate_policy(policy):
    errors = []
    if policy.get("canonicalPositioning") != "全面开放注册；邀请码仅用于赛事参与":
        errors.append("canonicalPositioning must be 全面开放注册；邀请码仅用于赛事参与")
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(policy.get("version", ""))):
        errors.append("version must use semantic versioning")
    if not policy.get("scanPaths"):
        errors.append("scanPaths must not be empty")
    for name in ("allowedClaims", "prohibitedClaims", "pendingVerificationClaims"):
        errors.extend(validate_claim_list(name, policy.get(name)))
    return errors


def matching_findings(line, line_number, path, claims, level):
    findings = []
    for claim in claims:
        for pattern in claim["patterns"]:
            if re.search(pattern, line):
                findings.append({
                    "level": level, "rule": claim["id"],
                    "path": str(path), "line": line_number, "text": line.strip(),
                })
                break
    return findings


def scan_file(path, policy):
    findings = []
    text = path.read_text(encoding="utf-8")
    for line_number, line in enumerate(text.splitlines(), start=1):
        for claim_group, level in LEVELS:
            findings.extend(matching_findings(
                line, line_number, path, policy[claim_group], level
            ))
    return findings


def iter_files(root, scan_paths):
    for relative in scan_paths:
        path = root / relative
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
            yield path
        elif path.is_dir():
            yield from (
                item for item in path.rglob("*")
                if item.is_file() and item.suffix.lower() in TEXT_SUFFIXES
            )


def canonical_findings(files, policy):
    corpus = "\n".join(path.read_text(encoding="utf-8") for path in files)
    required = policy["canonicalPositioning"].split("、")
    return [{
        "level": "error", "rule": "REQUIRE_CANONICAL_POSITIONING",
        "path": "<scope>", "line": 0, "text": f"缺少唯一口径：{term}",
    } for term in required if term not in corpus]


def run(root, policy):
    files = list(iter_files(root, policy["scanPaths"]))
    findings = canonical_findings(files, policy)
    for path in files:
        findings.extend(scan_file(path, policy))
    return files, findings


def print_findings(files, findings):
    for finding in findings:
        location = f"{finding['path']}:{finding['line']}"
        print(f"{finding['level'].upper()} {finding['rule']} {location}")
        print(f"  {finding['text']}")
    errors = sum(item["level"] == "error" for item in findings)
    warnings = sum(item["level"] == "warning" for item in findings)
    print(f"Scanned {len(files)} files: {errors} error(s), {warnings} warning(s).")
    return errors


def main():
    parser = argparse.ArgumentParser(description="Check Skillver content claims.")
    parser.add_argument("--root", type=Path, default=Path(__file__).parents[1])
    parser.add_argument("--policy", type=Path)
    args = parser.parse_args()
    policy_path = args.policy or args.root / "docs" / "content-claims.json"
    policy = json.loads(policy_path.read_text(encoding="utf-8"))
    policy_errors = validate_policy(policy)
    if policy_errors:
        print("\n".join(f"POLICY ERROR: {error}" for error in policy_errors))
        return 2
    files, findings = run(args.root, policy)
    return 1 if print_findings(files, findings) else 0


if __name__ == "__main__":
    sys.exit(main())
