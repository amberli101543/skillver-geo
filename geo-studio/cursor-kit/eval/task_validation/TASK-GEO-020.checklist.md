# Validation — TASK-GEO-020

- [x] 改动：engine-test.controller.ts、engine.module.ts、engine-test-service.ts（EngineTestWithScore 类型）
- [x] `npm --prefix backend test` PASS（34 用例）
- [x] typecheck PASS
- [x] golden：engine-test-api-scored-001.json
- [x] 仅 backend（R6）

**Result**: PASS

**Notes**: POST /brands/:id/engine-tests 返回 `{ ...EngineTestResult, score: TestScore }`；EngineModule imports ScoringModule。
