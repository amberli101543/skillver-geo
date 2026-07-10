# Validation — SPEC-GEO-025

- [x] `RuleScoringPipeline` 保留原有规则评分
- [x] `ProxyScoringPipeline`：有 Key 且非 `SCORING_MODE=rule` 时走 LLM 评分
- [x] LLM 响应校验失败时回退规则评分
- [x] `ScoringService.score()` 改为 async，跑批与 engine-test 已 await
- [x] `scoring-pipeline.test.ts` 覆盖 rule / llm / fallback
- [x] e2e 测试注入 `RuleScoringPipeline` + `ProxyScoringPipeline`
- [x] `npm --prefix backend test` PASS（125 用例）
- [x] `npm --prefix backend run typecheck` PASS

**Result**: PASS

**Notes**: `SCORING_MODE=rule` 强制规则评分；`SCORING_MODE=llm` 需配置 `OPENAI_API_KEY`；默认 auto 有 Key 走 LLM。
