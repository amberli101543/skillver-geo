#!/usr/bin/env python3
"""Lightweight cursor-kit task boundary checker (no TAEOS dependency)."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


def load_config(root: Path) -> dict:
    path = root / "project.config.yaml"
    if not path.exists() or yaml is None:
        return {
            "limits": {"max_files_per_task": 3, "max_lines_per_task": 100},
            "services": [],
        }
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_task(path: Path) -> dict:
    if yaml is None:
        print("ERROR: PyYAML required. pip install pyyaml", file=sys.stderr)
        sys.exit(2)
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def git_diff_stats(root: Path) -> tuple[int, int]:
    """Return (file_count, line_count) for unstaged+staged diff."""
    try:
        out = subprocess.check_output(
            ["git", "diff", "--numstat", "HEAD"],
            cwd=root,
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 0, 0
    files = 0
    lines = 0
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) >= 3:
            files += 1
            try:
                lines += int(parts[0]) + int(parts[1])
            except ValueError:
                pass
    return files, lines


def check_cross_service(files: list[str], services: list[str]) -> list[str]:
    if not services:
        return []
    hit = set()
    for f in files:
        for svc in services:
            prefix = svc.rstrip("/") + "/"
            if f.startswith(prefix) or f.startswith(svc + "\\"):
                hit.add(svc)
    if len(hit) > 1:
        return [f"R6: cross-service edit across {sorted(hit)}"]
    return []


def validate_task_card(task: dict, config: dict) -> list[str]:
    errors: list[str] = []
    limits = config.get("limits") or {}
    max_files = int(limits.get("max_files_per_task", 3))
    files = task.get("files_to_touch") or []
    if not task.get("task_id"):
        errors.append("missing task_id")
    if not task.get("spec_id"):
        errors.append("missing spec_id")
    if not task.get("goal"):
        errors.append("missing goal")
    if len(files) > max_files:
        errors.append(f"R2: files_to_touch={len(files)} > {max_files}")
    if not task.get("validation"):
        errors.append("missing validation rules")
    errors.extend(check_cross_service(files, config.get("services") or []))
    return errors


def main() -> int:
    p = argparse.ArgumentParser(description="cursor-kit task validator")
    p.add_argument("--task", type=Path, help="Path to tasks/TASK-*.yaml")
    p.add_argument("--diff", action="store_true", help="Check current git diff against limits")
    p.add_argument("--root", type=Path, default=Path.cwd())
    args = p.parse_args()
    root = args.root.resolve()
    config = load_config(root)
    limits = config.get("limits") or {}
    max_files = int(limits.get("max_files_per_task", 3))
    max_lines = int(limits.get("max_lines_per_task", 100))
    failures: list[str] = []

    if args.task:
        task = load_task(args.task.resolve())
        failures.extend(validate_task_card(task, config))

    if args.diff:
        fc, lc = git_diff_stats(root)
        if fc > max_files:
            failures.append(f"R2: git diff touches {fc} files > {max_files}")
        if lc > max_lines:
            failures.append(f"R3: git diff {lc} lines > {max_lines}")

    if failures:
        print("FAIL")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
