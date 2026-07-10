# Validation — SPEC-GEO-011

- [x] Prisma DiagnosticRun + MetricSnapshot schema + migration SQL
- [x] MetricSnapshotRepository + MetricsService + GET /brands/:id/metrics
- [x] POST diagnostic-runs 自动 persist 基线（3 条 snapshot）
- [x] backend tests: 42 passed; typecheck PASS
- [x] 仅 backend（R6）

**Result**: PASS

**Notes**: 本地 Docker 未运行时 migration 以 SQL 文件入库；`prisma migrate deploy` 需在 DB 可用时执行。
