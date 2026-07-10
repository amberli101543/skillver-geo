# Validation — SPEC-GEO-016

- [x] Prisma Assertion / Competitor 模型 + migration 20260612020000_brand_entities
- [x] BrandEntity CRUD API：GET/POST/DELETE `/brands/:brandId/assertions[/:assertionId]`
- [x] BrandEntity CRUD API：GET/POST/DELETE `/brands/:brandId/competitors[/:competitorId]`
- [x] DiagnosticService 合并已存竞品与 query 参数竞品（去重）
- [x] DiagnosticBatchService.runAndPersist 收拢跑批 + persistFullRun
- [x] DiagnosticBatchController 仅调用 runAndPersist
- [x] npm --prefix backend run typecheck PASS
- [x] npm --prefix backend test PASS

**Result**: PASS

**Notes**: Assertion 持久化供后续 GEO-019/020 使用；看板竞品管理 UI 留 GEO-018。
