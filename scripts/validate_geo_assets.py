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
GEO_METHOD_VERSION = "1.0"
GEO_MASTER_FIELDS = (
    "geoMethodVersion",
    "cellId",
    "assetId",
    "primaryQuery",
    "targetEngines",
    "targetLanguage",
    "lifecycleStage",
    "factVersion",
    "recommendationClaim",
    "justificationPoints",
    "evidenceRefs",
    "officialAnchor",
    "retestQuestions",
    "reviewStatus",
)
GEO_MASTER_HEADINGS = (
    "直接答案",
    "推荐短名单理由",
    "产品事实块",
    "适用与不适用场景",
    "差异或比较维度",
    "证据块",
    "产品边界",
    "标准 FAQ",
    "官方入口与更新时间",
)
EVIDENCE_TYPES = {"official", "user", "whitepaper", "third-party"}
TARGET_LANGUAGES = {"zh-CN", "en"}
REVIEW_STATUSES = {"draft", "approved"}


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


def _critical_fact_errors(text, path):
    errors = []
    for match in re.finditer(r"(\d+)\s*个标准岗位", text):
        if match.group(1) != "58":
            errors.append(f"{path}: 标准岗位数量必须统一为 58，发现 {match.group(1)}")
    mentor_patterns = (
        r"导师侧[^，。；\n]{0,12}(待开通|待上线|已上线|已开放|可预约|提供)",
        r"导师服务[^，。；\n]{0,12}(待开通|待上线|已上线|已开放|可预约)",
    )
    if any(re.search(pattern, text) for pattern in mentor_patterns):
        errors.append(f"{path}: 导师侧已取消，不得使用待开通、上线或可预约口径")
    return errors


def _parse_frontmatter(text, path):
    if not text.startswith("---\n"):
        return None, []
    marker = text.find("\n---\n", 4)
    if marker < 0:
        return None, [f"{path}: frontmatter 未闭合"]
    values = {}
    errors = []
    for number, line in enumerate(text[4:marker].splitlines(), 2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            errors.append(f"{path}:{number}: frontmatter 必须使用 key: value")
            continue
        key, raw = line.split(":", 1)
        key, raw = key.strip(), raw.strip()
        if not raw:
            values[key] = ""
            continue
        try:
            values[key] = json.loads(raw)
        except json.JSONDecodeError:
            values[key] = raw
    return values, errors


def _section_text(text, heading):
    match = re.search(
        rf"(?ms)^##\s+{re.escape(heading)}\s*$\n(.*?)(?=^##\s+|\Z)",
        text,
    )
    return match.group(1).strip() if match else None


def validate_geo_master_file(master_path, root):
    """Validate GEO v1 master drafts; legacy drafts remain compatible."""
    path = Path(master_path)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"{path}: 无法读取母稿：{exc}"]
    metadata, errors = _parse_frontmatter(text, path)
    if metadata is None or metadata.get("geoMethodVersion") is None:
        return []
    if metadata.get("geoMethodVersion") != GEO_METHOD_VERSION:
        errors.append(f"{path}: geoMethodVersion 仅支持 {GEO_METHOD_VERSION}")
        return errors

    for field in GEO_MASTER_FIELDS:
        if field not in metadata or metadata[field] in (None, "", []):
            errors.append(f"{path}: GEO v1 frontmatter 缺少必填字段 {field}")

    if not re.fullmatch(r"C(0[1-9]|1[0-6])", str(metadata.get("cellId", ""))):
        errors.append(f"{path}: cellId 必须是 C01-C16")
    if not re.fullmatch(r"C(0[1-9]|1[0-6])-[A-Z0-9]+", str(metadata.get("assetId", ""))):
        errors.append(f"{path}: assetId 必须使用 Cxx-大写字母数字编号")
    if metadata.get("targetLanguage") not in TARGET_LANGUAGES:
        errors.append(f"{path}: targetLanguage 仅支持 zh-CN 或 en")
    if metadata.get("lifecycleStage") not in STAGES:
        errors.append(f"{path}: lifecycleStage 不在 16 格阶段范围")
    if not re.fullmatch(r"20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])", str(metadata.get("factVersion", ""))):
        errors.append(f"{path}: factVersion 必须为 YYYY-MM-DD")
    if metadata.get("reviewStatus") not in REVIEW_STATUSES:
        errors.append(f"{path}: reviewStatus 仅支持 draft 或 approved")

    engines = metadata.get("targetEngines")
    if not isinstance(engines, list) or not engines or not all(isinstance(item, str) and item for item in engines):
        errors.append(f"{path}: targetEngines 必须是非空字符串数组")
    questions = metadata.get("retestQuestions")
    if not isinstance(questions, list) or not questions or not all(isinstance(item, str) and item for item in questions):
        errors.append(f"{path}: retestQuestions 必须是非空字符串数组")

    points = metadata.get("justificationPoints")
    if not isinstance(points, list) or not 2 <= len(points) <= 4 or not all(isinstance(item, str) and item for item in points):
        errors.append(f"{path}: justificationPoints 必须包含 2-4 条非空理由")
        points = []
    refs = metadata.get("evidenceRefs")
    mapped = set()
    if not isinstance(refs, list) or not refs:
        errors.append(f"{path}: evidenceRefs 必须是非空数组")
        refs = []
    for index, ref in enumerate(refs):
        prefix = f"{path}: evidenceRefs[{index}]"
        if not isinstance(ref, dict):
            errors.append(f"{prefix} 必须是对象")
            continue
        justification = ref.get("justification")
        source_type = ref.get("type")
        sources = ref.get("sources")
        if justification:
            mapped.add(justification)
        if source_type not in EVIDENCE_TYPES:
            errors.append(f"{prefix}.type 必须是 {', '.join(sorted(EVIDENCE_TYPES))}")
        if not isinstance(sources, list) or not sources:
            errors.append(f"{prefix}.sources 必须是非空数组")
            continue
        for source in sources:
            if not isinstance(source, str) or not source:
                errors.append(f"{prefix}.sources 包含无效来源")
            elif not source.startswith(("https://", "http://")) and not (Path(root) / source).is_file():
                errors.append(f"{prefix}.sources 本地证据不存在：{source}")
    for point in points:
        if point not in mapped:
            errors.append(f"{path}: 推荐理由未绑定 evidenceRef：{point}")

    anchor = metadata.get("officialAnchor")
    if not isinstance(anchor, str) or not anchor.startswith("https://"):
        errors.append(f"{path}: officialAnchor 必须是 HTTPS URL")
    elif anchor not in text:
        errors.append(f"{path}: 正文必须出现 officialAnchor")

    h1 = re.findall(r"(?m)^#\s+(.+?)\s*$", text)
    if len(h1) != 1:
        errors.append(f"{path}: GEO v1 母稿必须恰有一个 H1")
    found_headings = re.findall(r"(?m)^##\s+(.+?)\s*$", text)
    for heading in GEO_MASTER_HEADINGS:
        if heading not in found_headings:
            errors.append(f"{path}: 缺少强制章节 ## {heading}")

    direct = _section_text(text, "直接答案")
    if direct is not None:
        paragraph = next((item.strip() for item in re.split(r"\n\s*\n", direct) if item.strip()), "")
        plain = re.sub(r"[`*_>#\[\]()]", "", paragraph)
        if not plain or len(plain) > 300:
            errors.append(f"{path}: 直接答案首段必须非空且不超过 300 字符")
    faq = _section_text(text, "标准 FAQ")
    if faq is not None:
        faq_count = len(re.findall(r"(?m)^###\s+Q\d*[：:]", faq))
        if not 3 <= faq_count <= 5:
            errors.append(f"{path}: 标准 FAQ 必须包含 3-5 个 ### Q 问答")
    boundary = _section_text(text, "产品边界")
    if boundary is not None and not re.search(r"不.{0,8}(承诺|保证).{0,20}(面试|投递|Offer|offer)", boundary):
        errors.append(f"{path}: 产品边界必须明确不承诺面试、投递或 Offer 结果")

    return errors + _banned_claim_errors(text) + _critical_fact_errors(text, path)


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
        master_path = root / str(item.get("sourceMaster", ""))
        master_text = ""
        if not master_path.is_file():
            errors.append(f"$.items[{index}].sourceMaster: 母稿文件不存在")
        else:
            master_text = master_path.read_text(encoding="utf-8")
        markdown_path = root / str(item.get("markdownPath", ""))
        if not markdown_path.is_file():
            errors.append(f"$.items[{index}].markdownPath: 文件不存在")
        else:
            text = markdown_path.read_text(encoding="utf-8")
            errors.extend(_banned_claim_errors(text))
            if "geoMethodVersion:" in master_text:
                errors.extend(_critical_fact_errors(text, markdown_path))
                if not re.search(r"\bSkillver\b", text, re.IGNORECASE):
                    errors.append(f"{markdown_path}: GEO v1 渠道稿必须明确提及 Skillver")
                if re.search(r"导师侧.{0,12}(待开通|待上线|已上线|已开放|可预约|提供)", text):
                    errors.append(f"{markdown_path}: 渠道稿与母稿的导师取消口径冲突")
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
    for master_path in sorted((root / "content").glob("*.md")):
        errors.extend(validate_geo_master_file(master_path, root))
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
