# Validation — SPEC-GEO-015

- [x] Prisma Question / EngineTest / TestScore 模型 + migration 20260612010000_diagnostic_details
- [x] DiagnosticRunRepository.persistFullRun 单事务写 run + 3 snapshots + 每题明细
- [x] POST diagnostic-runs 返回 diagnosticRunId
- [x] GET /brands/:brandId/diagnostic-runs 列表
- [x] GET /brands/:brandId/diagnostic-runs/:runId 明细（question + engineTest + score）
- [x] npm --prefix backend run typecheck PASS
- [x] npm --prefix backend test PASS（17 files / 48 tests）

**Result**: PASS

**Notes**: 看板 UI 展示留 GEO-018。MetricsService.persistFromBaseline 仍保留供独立调用，跑批已改走 DiagnosticRunRepository。
