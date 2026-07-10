# Validation — SPEC-GEO-017

- [x] Prisma RetestSchedule 模型 + migration 20260612030000_retest_schedule
- [x] GET/PUT `/brands/:brandId/retest-schedule`（默认 interval 168h）
- [x] RetestWorkerService 每分钟扫描到期 schedule，调用 runAndPersist
- [x] 成功跑批后更新 lastRunAt / nextRunAt；失败不推进 nextRunAt
- [x] `RETEST_WORKER_ENABLED=false` 可关闭定时任务
- [x] npm --prefix backend run typecheck PASS
- [x] npm --prefix backend test PASS（22 files / 66 tests）

**Result**: PASS

**Notes**: 看板配置 UI 留 GEO-018；本地开发可用 PUT 启用后等待 cron 或手动 POST diagnostic-runs。
