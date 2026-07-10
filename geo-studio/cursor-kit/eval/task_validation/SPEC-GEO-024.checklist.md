# Validation — SPEC-GEO-024

- [x] `llm-client.ts` 共享 `requestChatJson` + OpenAI chat completions
- [x] `llm-config.ts`：`ENGINE_MODE` / `AI_MODE` / `SCORING_MODE` / `CONTENT_MODE` 解析
- [x] `prompt-registry.ts`：engine / scoring / content v1 prompt + 版本 env
- [x] `proxy-engine-connector.ts` 与 `content-generator.ts` 复用共享客户端
- [x] `GET /ai/status` 返回 engineMode、scoringMode、model、promptVersions
- [x] 无 `OPENAI_API_KEY` 时引擎仍走 stub
- [x] 看板 header 展示 AI 状态
- [x] `npm --prefix backend test` PASS（125 用例）
- [x] `npm --prefix backend run typecheck` PASS
- [x] `npm --prefix web run build` PASS

**Result**: PASS

**Notes**: `ENGINE_MODE=stub` 或 `AI_MODE=stub` 强制 stub 引擎；`CONTENT_MODE=stub` 强制 stub 内容生成。Prompt 版本可通过 `ENGINE_PROMPT_VERSION` 等 env 覆盖。
