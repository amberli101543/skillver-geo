# Validation — TASK-GEO-056

- [x] `web/src/api.ts` — `updateMatrixCell` / `updateSource` / `deleteContentDraft` / `fetchQuestions`
- [x] `web/src/DraftEditor.tsx` — PATCH body 保存 + DELETE 初稿
- [x] `web/src/MatrixPanel.tsx` — DraftEditor 集成、格子 PUT、无断言 warning、删除初稿
- [x] `web/src/DistributionPanel.tsx` — 信源 PUT 行内编辑
- [x] `web/src/DiagnosticRunsPanel.tsx` — GET questions 问题集预览折叠
- [x] `npm --prefix web run build` PASS
- [x] `npm --prefix backend test` PASS (127)
- [x] `npm --prefix backend run typecheck` PASS

**Result**: PASS
