#!/usr/bin/env python3
"""Validate Skillver GEO matrix and publication ledger with stdlib only."""

import argparse
import csv
import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BANNED_CLAIMS = (
    "邀请码准入",
    "当前版本永久免费",
    "保证offer",
    "保证 offer",
    "包拿offer",
    "保过",
)
STAGES = ("认知期", "选型对比期", "使用场景期", "信任顾虑期")
ANGLES = ("定义解释", "对比评测", "操作指南", "案例/数据")
EXPECTED_CHANNELS = {
    "C01": {"tcodeai", "main-faq", "wechat", "xiaohongshu", "zhihu"},
    "C05": {"tcodeai", "main-faq", "wechat", "xiaohongshu", "zhihu"},
    "C13": {"tcodeai", "main-faq", "wechat", "xiaohongshu", "zhihu"},
    "C15": {"tcodeai", "main-faq", "wechat", "xiaohongshu", "zhihu"},
    "C16": {"tcodeai", "main-faq", "wechat", "xiaohongshu"},
}


def _load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8")), []
    except (OSError, json.JSONDecodeError) as exc:
        return None, [f"{path}: 无法读取 JSON：{exc}"]


def _matches_type(value, expected):
    checks = {
        "object": lambda item: isinstance(item, dict),
        "array": lambda item: isinstance(item, list),
        "string": lambda item: isinstance(item, str),
        "null": lambda item: item is None,
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "boolean": lambda item: isinstance(item, bool),
    }
    names = expected if isinstance(expected, list) else [expected]
    return any(checks.get(name, lambda item: True)(value) for name in names)


def _validate_string(value, schema, path):
    errors = []
    if "minLength" in schema and len(value) < schema["minLength"]:
        errors.append(f"{path}: 长度小于 {schema['minLength']}")
    if "pattern" in schema and not re.fullmatch(schema["pattern"], value):
        errors.append(f"{path}: 值 {value!r} 不符合 pattern {schema['pattern']}")
    return errors


def _validate_object(value, schema, path):
    errors = []
    required = schema.get("required", [])
    properties = schema.get("properties", {})
    for name in required:
        if name not in value:
            errors.append(f"{path}: 缺少必填字段 {name}")
    if schema.get("additionalProperties") is False:
        for name in value.keys() - properties.keys():
            errors.append(f"{path}: 不允许字段 {name}")
    for name, item in value.items():
        if name in properties:
            errors.extend(_validate_schema(item, properties[name], f"{path}.{name}"))
    return errors


def _validate_array(value, schema, path):
    errors = []
    if len(value) < schema.get("minItems", 0):
        errors.append(f"{path}: 项数少于 {schema['minItems']}")
    if "maxItems" in schema and len(value) > schema["maxItems"]:
        errors.append(f"{path}: 项数多于 {schema['maxItems']}")
    for index, item in enumerate(value):
        errors.extend(_validate_schema(item, schema.get("items", {}), f"{path}[{index}]"))
    return errors


def _validate_schema(value, schema, path="$"):
    expected = schema.get("type")
    if expected and not _matches_type(value, expected):
        return [f"{path}: 类型错误，要求 {expected}"]
    if "enum" in schema and value not in schema["enum"]:
        return [f"{path}: 值 {value!r} 不在允许范围"]
    if isinstance(value, str):
        return _validate_string(value, schema, path)
    if isinstance(value, dict):
        return _validate_object(value, schema, path)
    if isinstance(value, list):
        return _validate_array(value, schema, path)
    return []


def _iter_strings(value, path="$"):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for name, item in value.items():
            yield from _iter_strings(item, f"{path}.{name}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from _iter_strings(item, f"{path}[{index}]")


def _banned_claim_errors(value):
    errors = []
    for path, text in _iter_strings(value):
        compact = re.sub(r"\s+", "", text).lower()
        for claim in BANNED_CLAIMS:
            if re.sub(r"\s+", "", claim).lower() in compact:
                errors.append(f"{path}: 命中过时准入禁语 {claim!r}")
    return errors


def _matrix_invariant_errors(matrix):
    if not isinstance(matrix, dict) or not isinstance(matrix.get("cells"), list):
        return []
    cells = matrix["cells"]
    identifiers = [cell.get("cellId") for cell in cells if isinstance(cell, dict)]
    expected_ids = {f"C{number:02d}" for number in range(1, 17)}
    errors = [] if set(identifiers) == expected_ids else ["$.cells: cellId 必须恰为 C01-C16"]
    if len(identifiers) != len(set(identifiers)):
        errors.append("$.cells: cellId 不得重复")
    for number, cell in enumerate(cells, 1):
        if not isinstance(cell, dict) or cell.get("cellId") != f"C{number:02d}":
            continue
        expected = (STAGES[(number - 1) // 4], ANGLES[(number - 1) % 4])
        if (cell.get("lifecycleStage"), cell.get("contentAngle")) != expected:
            errors.append(f"$.cells[{number - 1}]: {cell['cellId']} 轴位不匹配")
    return errors


def validate_matrix_file(matrix_path, schema_path):
    matrix, errors = _load_json(matrix_path)
    schema, schema_errors = _load_json(schema_path)
    if errors or schema_errors:
        return errors + schema_errors
    return (
        _validate_schema(matrix, schema)
        + _matrix_invariant_errors(matrix)
        + _banned_claim_errors(matrix)
    )


def _read_publish_rows(path):
    try:
        with Path(path).open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
            return reader.fieldnames or [], rows, []
    except (OSError, csv.Error) as exc:
        return [], [], [f"{path}: 无法读取 CSV：{exc}"]


def _ledger_invariant_errors(rows):
    errors = []
    for field in ("recordId", "url"):
        values = [row.get(field) for row in rows if row.get(field)]
        if len(values) != len(set(values)):
            errors.append(f"$: {field} 存在重复值")
    for index, row in enumerate(rows):
        if row.get("status") == "已发布" and not row.get("url"):
            errors.append(f"$[{index}].url: 已发布记录必须有 URL")
    return errors


def validate_publish_log(log_path, schema_path):
    schema, schema_errors = _load_json(schema_path)
    headers, rows, read_errors = _read_publish_rows(log_path)
    if schema_errors or read_errors:
        return schema_errors + read_errors
    required = schema.get("items", {}).get("required", [])
    errors = [f"$: CSV 缺少列 {name}" for name in required if name not in headers]
    normalized = [
        {name: (None if name == "publishedAt" and value == "" else value)
         for name, value in row.items()}
        for row in rows
    ]
    return (
        errors
        + _validate_schema(normalized, schema)
        + _ledger_invariant_errors(rows)
        + _banned_claim_errors(rows)
    )


def _channel_manifest_invariant_errors(manifest):
    if not isinstance(manifest, dict) or not isinstance(manifest.get("items"), list):
        return []
    items = manifest["items"]
    errors = []
    pairs = {(item.get("cellId"), item.get("channel")) for item in items if isinstance(item, dict)}
    expected = {
        (cell_id, channel)
        for cell_id, channels in EXPECTED_CHANNELS.items()
        for channel in channels
    }
    if not expected.issubset(pairs):
        errors.append("$.items: 缺少首轮排期定义的 cellId+channel 组合")
    for field in ("contentId", "markdownPath"):
        values = [item.get(field) for item in items if isinstance(item, dict) and item.get(field)]
        if len(values) != len(set(values)):
            errors.append(f"$.items: {field} 不得重复")
    html_paths = [
        item.get("cmsHtmlPath")
        for item in items
        if isinstance(item, dict) and item.get("cmsHtmlPath")
    ]
    if len(html_paths) != len(set(html_paths)):
        errors.append("$.items: cmsHtmlPath 不得重复")
    return errors


def _validate_html_fragment(text, channel, path):
    errors = []
    lowered = text.lower()
    for tag in ("html", "body", "script", "style", "nav"):
        if re.search(rf"<\s*{tag}\b", lowered):
            errors.append(f"{path}: CMS 片段禁止包含 <{tag}>")
    if channel == "tcodeai":
        if len(re.findall(r"<\s*h1\b", lowered)) != 1:
            errors.append(f"{path}: tcodeai HTML 必须恰有一个 H1")
        if not re.search(r"<\s*article\b", lowered):
            errors.append(f"{path}: tcodeai HTML 必须使用 <article>")
    if channel == "main-faq":
        if not re.search(r"<\s*section\b[^>]*data-content-type=[\"']faq[\"']", lowered):
            errors.append(f"{path}: main-faq HTML 必须使用 FAQ section")
        if not re.search(r"<\s*details\b", lowered) or not re.search(r"<\s*summary\b", lowered):
            errors.append(f"{path}: main-faq HTML 必须包含 details/summary")
    return errors


def _validate_channel_files(items, root):
    errors = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        markdown_path = root / str(item.get("markdownPath", ""))
        if not markdown_path.is_file():
            errors.append(f"$.items[{index}].markdownPath: 文件不存在")
        else:
            text = markdown_path.read_text(encoding="utf-8")
            errors.extend(_banned_claim_errors(text))
            for field in (
                "contentId",
                "cellId",
                "channel",
                "title",
                "status",
                "sourceMaster",
                "scheduledAt",
            ):
                expected = str(item.get(field, ""))
                if not re.search(rf"(?m)^{re.escape(field)}:\s*{re.escape(expected)}\s*$", text):
                    errors.append(f"{markdown_path}: frontmatter 缺少或不匹配 {field}")
            headings = re.findall(r"(?m)^#\s+(.+?)\s*$", text)
            if len(headings) != 1 or headings[0] != item.get("title"):
                errors.append(f"{markdown_path}: 必须恰有一个与 manifest.title 一致的 H1")
        html_ref = item.get("cmsHtmlPath")
        if not html_ref:
            continue
        html_path = root / str(html_ref)
        if not html_path.is_file():
            errors.append(f"$.items[{index}].cmsHtmlPath: 文件不存在")
            continue
        html = html_path.read_text(encoding="utf-8")
        errors.extend(_banned_claim_errors(html))
        errors.extend(_validate_html_fragment(html, item.get("channel"), html_path))
    return errors


def validate_channel_manifest(manifest_path, schema_path, root):
    manifest, errors = _load_json(manifest_path)
    schema, schema_errors = _load_json(schema_path)
    if errors or schema_errors:
        return errors + schema_errors
    schema_findings = _validate_schema(manifest, schema)
    if schema_findings:
        return schema_findings
    return (
        _channel_manifest_invariant_errors(manifest)
        + _banned_claim_errors(manifest)
        + _validate_channel_files(manifest["items"], Path(root))
    )


def validate_upstream_manifest(manifest_path, root):
    manifest, errors = _load_json(manifest_path)
    if errors:
        return errors
    if manifest.get("repository") != "skillver_v1":
        return ["upstream manifest repository 必须为 skillver_v1"]
    snapshot_dir = manifest.get("snapshotDir")
    if not snapshot_dir:
        return ["upstream manifest 缺少 snapshotDir"]
    base = Path(root) / snapshot_dir
    if not base.is_dir():
        return [f"{snapshot_dir}: 快照目录不存在"]
    required = (
        "llms.txt",
        "seo-contract.json",
        "public-facts.json",
        "geo-implementation-status.json",
        "protected-sources.json",
    )
    file_errors = [f"{snapshot_dir}/{name}: 快照文件缺失" for name in required if not (base / name).is_file()]
    item_errors = []
    for index, item in enumerate(manifest.get("items", [])):
        snapshot_path = item.get("snapshotPath")
        if snapshot_path and not (Path(root) / snapshot_path).is_file():
            item_errors.append(f"$.items[{index}].snapshotPath: 文件不存在")
    return file_errors + item_errors


def validate_content_assets_manifest(manifest_path, root):
    manifest, errors = _load_json(manifest_path)
    if errors:
        return errors
    if manifest.get("baselineQuestionSet") != "baseline/skillver-question-set-v1.json":
        return ["$.baselineQuestionSet: 必须指向 baseline/skillver-question-set-v1.json"]
    item_errors = []
    for index, item in enumerate(manifest.get("items", [])):
        rel = item.get("file")
        if not rel:
            item_errors.append(f"$.items[{index}].file: 缺失")
            continue
        path = Path(root) / rel
        if not path.is_file():
            item_errors.append(f"{rel}: 文件不存在")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if item.get("sha256") != digest:
            item_errors.append(f"{rel}: sha256 与 manifest 不一致")
    return item_errors


def validate_repository(root):
    matrix_path = root / "matrix" / "skillver-16-cells.json"
    matrix_schema = root / "schemas" / "skillver-16-cells.schema.json"
    log_path = root / "ops" / "publish-log.csv"
    log_schema = root / "schemas" / "publish-log.schema.json"
    channel_manifest = root / "content" / "publish-ready" / "manifest.json"
    channel_schema = root / "schemas" / "channel-content.schema.json"
    upstream_manifest = root / "upstream" / "skillver_v1" / "manifest.json"
    content_assets_manifest = root / "03-content-assets" / "manifest.json"
    errors = validate_matrix_file(matrix_path, matrix_schema)
    errors.extend(validate_publish_log(log_path, log_schema))
    errors.extend(validate_channel_manifest(channel_manifest, channel_schema, root))
    errors.extend(validate_upstream_manifest(upstream_manifest, root))
    errors.extend(validate_content_assets_manifest(content_assets_manifest, root))
    return errors


def main():
    parser = argparse.ArgumentParser(description="验证 Skillver GEO 16格与发布台账")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    errors = validate_repository(args.root.resolve())
    if errors:
        print("\n".join(f"ERROR {error}" for error in errors))
        return 1
    print("OK: GEO 资产、上游快照与发布台账验证通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
