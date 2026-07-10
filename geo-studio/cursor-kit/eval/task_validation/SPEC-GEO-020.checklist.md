# Validation — SPEC-GEO-020

- [x] Prisma ContentDraft 模型 + migration 20260612050000_content_drafts
- [x] ProxyContentGenerator：无 Key 走 stub，有 Key 走 OpenAI
- [x] POST `/brands/:brandId/matrix-cells/:cellId/content-drafts/generate`
- [x] GET/PATCH/DELETE content-drafts API
- [x] MatrixPanel：矩阵列表、同步缺口、生成初稿、提交审核
- [x] npm --prefix backend run typecheck PASS
- [x] npm --prefix backend test PASS（29 files / 91 tests）
- [x] npm --prefix web run build PASS

**Result**: PASS

**Notes**: 初稿编辑 UI 可后续增强；发布链路留 GEO-021+。
