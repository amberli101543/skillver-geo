#!/usr/bin/env python3
"""Run Skillver GEO R0 baseline against live OpenAI-compatible engines.

Does NOT require GEO Studio / Docker. Reads keys from geo-studio/backend/.env
(or --env-file). Writes raw answers + heuristic judgments under baseline/results/.

Usage:
  python scripts/run_baseline_r0.py --engines doubao,kimi,deepseek
  python scripts/run_baseline_r0.py --engines kimi --limit 3   # smoke
  python scripts/run_baseline_r0.py --dry-run                 # show planned calls
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _ssl_context() -> ssl.SSLContext:
    """Prefer certifi CA bundle (fixes macOS system Python CERTIFICATE_VERIFY_FAILED)."""
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".python_pkgs"))
DEFAULT_ENV = ROOT / "geo-studio" / "backend" / ".env"
QUESTION_SET = ROOT / "baseline" / "skillver-question-set-v1.json"
RESULTS_ROOT = ROOT / "baseline" / "results"

# Mirror geo-studio/backend/src/engine/connectors/chat-engine-vendors.ts
ENGINES: dict[str, dict[str, Any]] = {
    "doubao": {
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "default_model": "doubao-seed-1-6-251015",
        "key_vars": ["DOUBAO_API_KEY", "ARK_API_KEY"],
        "model_var": "DOUBAO_MODEL",
        "base_url_var": "DOUBAO_BASE_URL",
        "mode_var": "DOUBAO_MODE",
    },
    "kimi": {
        "base_url": "https://api.moonshot.cn/v1",
        "default_model": "kimi-k2.6",
        "key_vars": ["KIMI_API_KEY", "MOONSHOT_API_KEY"],
        "model_var": "KIMI_MODEL",
        "base_url_var": "KIMI_BASE_URL",
        "mode_var": "KIMI_MODE",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "default_model": "deepseek-chat",
        "key_vars": ["DEEPSEEK_API_KEY"],
        "model_var": "DEEPSEEK_MODEL",
        "base_url_var": "DEEPSEEK_BASE_URL",
        "mode_var": "DEEPSEEK_MODE",
    },
    "yuanbao": {
        "base_url": "https://tokenhub.tencentmaas.com/v1",
        "default_model": "hy3-preview",
        "key_vars": ["YUANBAO_API_KEY", "HUNYUAN_API_KEY"],
        "model_var": "YUANBAO_MODEL",
        "base_url_var": "YUANBAO_BASE_URL",
        "mode_var": "YUANBAO_MODE",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "default_model": "gemini-3.5-flash",
        "key_vars": ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        "model_var": "GEMINI_MODEL",
        "base_url_var": "GEMINI_BASE_URL",
        "mode_var": "GEMINI_MODE",
    },
    "chatgpt": {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-5.5",
        "key_vars": ["CHATGPT_API_KEY", "OPENAI_API_KEY"],
        "model_var": "CHATGPT_MODEL",
        "base_url_var": "CHATGPT_BASE_URL",
        "mode_var": "CHATGPT_MODE",
    },
    "claude": {
        "base_url": "https://api.anthropic.com/v1",
        "default_model": "claude-sonnet-4-6",
        "key_vars": ["CLAUDE_API_KEY", "ANTHROPIC_API_KEY"],
        "model_var": "CLAUDE_MODEL",
        "base_url_var": "CLAUDE_BASE_URL",
        "mode_var": "CLAUDE_MODE",
    },
    "perplexity": {
        "base_url": "https://api.perplexity.ai",
        "default_model": "sonar",
        "key_vars": ["PERPLEXITY_API_KEY"],
        "model_var": "PERPLEXITY_MODEL",
        "base_url_var": "PERPLEXITY_BASE_URL",
        "mode_var": "PERPLEXITY_MODE",
    },
}

STALE_PATTERNS = [
    r"邀请码准入",
    r"仍需邀请才能注册",
    r"需要邀请码才能注册",
    r"封闭内测准入",
    r"目前仍在内测.*邀请",
    r"邀请制.*注册",
]
MENTION_PATTERNS = [r"skillver", r"才谱\s*ai", r"才谱人工智能"]
ENTRY_OK = [r"skillver\.cn", r"skillver\.ai"]
OFFICIAL_SRC = [r"skillver\.cn", r"skillver\.ai", r"tcodeai\.com"]
POSITIONING_HINTS = [r"ai\s*求职", r"求职助手", r"选岗", r"ai\s*面试", r"能力报告", r"人才猎头"]


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        k = k.strip()
        v = v.strip()
        # Strip unquoted inline comments: KEY=value  # note
        if " #" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split(" #", 1)[0].rstrip()
        v = v.strip().strip('"').strip("'").strip()
        # API keys must be ASCII for HTTP Authorization headers
        if "API_KEY" in k and v and not v.isascii():
            ascii_part = "".join(c for c in v if 32 <= ord(c) < 127).split()
            v = ascii_part[0] if ascii_part else ""
        out[k] = v
    return out


_PLACEHOLDER_KEYS = {
    "",
    "...",
    "sk-...",
    "pplx-...",
    "changeme",
    "your_key_here",
    "xxx",
    "todo",
    "sk-xxx",
    "你的key",
}


def resolve_key(env: dict[str, str], engine_id: str) -> str | None:
    cfg = ENGINES[engine_id]
    for name in cfg["key_vars"]:
        val = (env.get(name) or os.environ.get(name) or "").strip()
        if not val or val.lower() in _PLACEHOLDER_KEYS:
            continue
        if val.endswith("...") or not val.isascii() or len(val) < 16:
            continue
        return val
    return None


def resolve_model(env: dict[str, str], engine_id: str) -> str:
    cfg = ENGINES[engine_id]
    return env.get(cfg["model_var"]) or os.environ.get(cfg["model_var"]) or cfg["default_model"]


def resolve_base_url(env: dict[str, str], engine_id: str) -> str:
    cfg = ENGINES[engine_id]
    return (
        env.get(cfg["base_url_var"])
        or os.environ.get(cfg["base_url_var"])
        or cfg["base_url"]
    ).rstrip("/")


def is_stub_forced(env: dict[str, str], engine_id: str) -> bool:
    cfg = ENGINES[engine_id]
    mode = env.get(cfg["mode_var"]) or os.environ.get(cfg["mode_var"]) or env.get("ENGINE_MODE") or os.environ.get("ENGINE_MODE")
    return (mode or "").strip().lower() == "stub"


def chat_completions(
    *,
    base_url: str,
    api_key: str,
    model: str,
    question: str,
    timeout_s: float = 60.0,
) -> tuple[str, list[dict[str, str]], dict[str, Any]]:
    url = f"{base_url}/chat/completions"
    body = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an AI assistant answering end-user questions. "
                    "Answer in Chinese when the question is in Chinese. Be factual and concise."
                ),
            },
            {"role": "user", "content": question},
        ],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s, context=_ssl_context()) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e

    answer = (payload.get("choices") or [{}])[0].get("message", {}).get("content") or ""
    answer = answer.strip()
    if not answer:
        raise RuntimeError("empty answer from model")

    sources: list[dict[str, str]] = []
    for c in payload.get("citations") or []:
        if isinstance(c, str) and c:
            sources.append({"url": c, "title": ""})
    for sr in payload.get("search_results") or []:
        if isinstance(sr, dict) and sr.get("url"):
            sources.append({"url": str(sr["url"]), "title": str(sr.get("title") or "")})
    return answer, sources, payload


def judge(answer: str, sources: list[dict[str, str]], category: str) -> dict[str, Any]:
    text = answer.lower()
    joined_src = " ".join(f"{s.get('url','')} {s.get('title','')}" for s in sources).lower()
    blob = f"{text}\n{joined_src}"

    mentioned = any(re.search(p, blob, re.I) for p in MENTION_PATTERNS)
    stale = any(re.search(p, answer, re.I) for p in STALE_PATTERNS)
    entry = any(re.search(p, blob, re.I) for p in ENTRY_OK)
    official = any(re.search(p, blob, re.I) for p in OFFICIAL_SRC)
    pos_hint = any(re.search(p, text, re.I) for p in POSITIONING_HINTS)

    if category == "brand":
        positioning = "yes" if mentioned and pos_hint and not stale else ("partial" if mentioned else "no")
        entry_j = "not-applicable"
    elif category == "entry":
        positioning = "not-applicable"
        if entry:
            entry_j = "yes"
        elif mentioned:
            entry_j = "partial"
        else:
            entry_j = "no"
    else:
        positioning = "yes" if mentioned and pos_hint else ("partial" if mentioned else "not-applicable")
        entry_j = "not-applicable"

    return {
        "mentioned": mentioned,
        "positioningCorrect": positioning,
        "entryUrlCorrect": entry_j,
        "officialSourceCited": official,
        "staleNarrative": stale,
        "hallucination": False,  # left for human review; heuristic does not claim hallucination
        "reviewer": "heuristic-r0-v1",
        "notes": "auto-judged; hallucination left false pending human review",
    }


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    by_engine: dict[str, list[dict[str, Any]]] = {}
    for r in records:
        by_engine.setdefault(r["engine"], []).append(r)

    def rate(items: list[dict[str, Any]], key: str, truth: Any = True) -> float | None:
        if not items:
            return None
        return round(sum(1 for i in items if i.get(key) == truth) / len(items), 4)

    engines = {}
    for eng, items in by_engine.items():
        engines[eng] = {
            "n": len(items),
            "mentionRate": rate(items, "mentioned", True),
            "staleNarrativeRate": rate(items, "staleNarrative", True),
            "officialSourceCiteRate": rate(items, "officialSourceCited", True),
            "positioningYesRate": rate(
                [i for i in items if i.get("positioningCorrect") != "not-applicable"],
                "positioningCorrect",
                "yes",
            ),
            "entryYesRate": rate(
                [i for i in items if i.get("entryUrlCorrect") != "not-applicable"],
                "entryUrlCorrect",
                "yes",
            ),
        }
    return {
        "total": len(records),
        "engines": engines,
        "overallMentionRate": rate(records, "mentioned", True),
        "overallStaleNarrativeRate": rate(records, "staleNarrative", True),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Skillver GEO R0 baseline")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument(
        "--engines",
        default="",
        help="comma-separated engine ids; default = all with keys configured",
    )
    parser.add_argument("--limit", type=int, default=0, help="limit questions (smoke)")
    parser.add_argument("--round-id", default="R0")
    parser.add_argument("--sleep", type=float, default=0.4, help="seconds between calls")
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force-stub-ok", action="store_true", help="allow stub engines (marks round smoke)")
    args = parser.parse_args()

    env = load_env(args.env_file)
    qs = json.loads(QUESTION_SET.read_text(encoding="utf-8"))
    questions = qs["questions"]
    if args.limit > 0:
        questions = questions[: args.limit]

    requested = [e.strip() for e in args.engines.split(",") if e.strip()] if args.engines else list(ENGINES)
    live: list[str] = []
    missing: list[str] = []
    stubbed: list[str] = []
    for eid in requested:
        if eid not in ENGINES:
            print(f"unknown engine: {eid}", file=sys.stderr)
            return 2
        if is_stub_forced(env, eid):
            stubbed.append(eid)
            continue
        if resolve_key(env, eid):
            live.append(eid)
        else:
            missing.append(eid)

    print(f"env: {args.env_file}")
    print(f"questions: {len(questions)} / {len(qs['questions'])}")
    print(f"live engines: {live or 'NONE'}")
    if missing:
        print(f"missing keys: {missing}")
    if stubbed:
        print(f"forced stub mode: {stubbed}")

    if not live:
        print(
            "\nNo live engines. Put keys into geo-studio/backend/.env then re-run.\n"
            "Example:\n"
            "  DOUBAO_API_KEY=...\n"
            "  DOUBAO_MODEL=ep-xxxxxxxx   # Ark 接入点时必填\n"
            "  KIMI_API_KEY=sk-...\n"
            "  DEEPSEEK_API_KEY=sk-...\n"
            "  DIAGNOSTIC_ENGINE_IDS=doubao,kimi,deepseek\n",
            file=sys.stderr,
        )
        return 1

    if missing and not args.force_stub_ok:
        print(f"note: skipping engines without keys: {missing}")

    planned = len(questions) * len(live)
    print(f"planned calls: {planned}")
    if args.dry_run:
        for q in questions:
            for eid in live:
                print(f"  {eid}\t{q['id']}\t{q['query']}")
        return 0

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = RESULTS_ROOT / f"{args.round_id}-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=False)
    raw_dir = out_dir / "raw"
    raw_dir.mkdir()

    records: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    n = 0
    for q in questions:
        for eid in live:
            n += 1
            key = resolve_key(env, eid)
            assert key
            model = resolve_model(env, eid)
            base_url = resolve_base_url(env, eid)
            print(f"[{n}/{planned}] {eid} {q['id']} …", flush=True)
            try:
                answer, sources, payload = chat_completions(
                    base_url=base_url,
                    api_key=key,
                    model=model,
                    question=q["query"],
                    timeout_s=args.timeout,
                )
            except Exception as exc:  # noqa: BLE001 — collect per-call failures
                errors.append({"engine": eid, "questionId": q["id"], "error": str(exc)})
                print(f"  FAIL: {exc}", flush=True)
                time.sleep(args.sleep)
                continue

            judgment = judge(answer, sources, q["category"])
            captured = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            record = {
                "roundId": args.round_id,
                "capturedAt": captured,
                "engine": eid,
                "surface": "api",
                "questionId": q["id"],
                "answerEvidence": answer,
                "evidenceUrlOrPath": str((raw_dir / f"{eid}-{q['id']}.json").relative_to(ROOT)),
                **judgment,
            }
            records.append(record)
            (raw_dir / f"{eid}-{q['id']}.json").write_text(
                json.dumps(
                    {
                        "engine": eid,
                        "model": model,
                        "baseUrl": base_url,
                        "question": q,
                        "answer": answer,
                        "sources": sources,
                        "raw": payload,
                        "record": record,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            time.sleep(args.sleep)

    summary = {
        "roundId": args.round_id,
        "productState": qs.get("productState"),
        "startedAt": stamp,
        "finishedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "engines": live,
        "missingKeys": missing,
        "questionCount": len(questions),
        "successCount": len(records),
        "errorCount": len(errors),
        "errors": errors,
        "metrics": summarize(records),
        "note": "API surface only; App/Web 端需人工补测。hallucination 字段需人工复核。",
    }
    (out_dir / "records.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in records) + ("\n" if records else ""),
        encoding="utf-8",
    )
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== R0 summary ===")
    print(json.dumps(summary["metrics"], ensure_ascii=False, indent=2))
    print(f"wrote: {out_dir}")
    if errors:
        print(f"errors: {len(errors)} (see summary.json)")
        return 3 if not records else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
