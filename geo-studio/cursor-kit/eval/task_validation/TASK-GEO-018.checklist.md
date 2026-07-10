# Validation — TASK-GEO-018

- [x] 改动：backend/src/scoring/score.ts、score.test.ts
- [x] `npm --prefix backend test` PASS（score.test 4 用例）
- [x] typecheck PASS
- [x] golden：eval/golden_cases/scoring/score-001.json
- [x] 仅 backend（R6）

**Result**: PASS

**Notes**: 规则化评分——mentioned/mentionPosition/sentiment/accuracy/sourcesCount；negative 关键词优先于 positive（避免「不推荐」误匹配「推荐」）。
