# Validation — SPEC-GEO-ARCH-001（Ai Facade）

- [x] `backend/src/ai/engine.facade.ts` — 引擎 LLM 调用集中
- [x] `backend/src/ai/scoring.facade.ts` — 评分 LLM 调用集中
- [x] `backend/src/ai/content.facade.ts` — 内容 LLM 调用集中
- [x] `engine/scoring/content` 无 `llm-client` / `prompt-registry` 直引
- [x] `AiModule` 导出三个 Facade；Engine/Scoring/Content 模块 import `AiModule`
- [x] `check-layer-boundaries.mjs` grandfather 清单已清空（仅 `ai/` 可引 LLM）
- [x] `npm --prefix backend test` PASS（134 tests）
- [x] `npm --prefix backend run typecheck` PASS
- [x] `npm --prefix backend run check:architecture` PASS
- [x] golden cases 仍有效（engine/scoring 行为不变）
