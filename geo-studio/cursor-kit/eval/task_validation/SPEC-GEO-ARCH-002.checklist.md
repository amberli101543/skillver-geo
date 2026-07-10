# Validation — SPEC-GEO-ARCH-002（Job 异步化）

- [x] Prisma `Job` 模型 + 迁移 `20260612230000_jobs`
- [x] `job.types.ts` / `job.repository.ts` / `job.service.ts` / `job-runner.service.ts`
- [x] `GET /jobs/:jobId` 查询任务状态
- [x] `POST diagnostic-runs` → 202 + jobId
- [x] `POST content-drafts/generate` → 202 + jobId
- [x] `POST distribution-tasks/:id/execute` → 202 + jobId
- [x] `JobRunnerService` cron 消费 pending 任务
- [x] `RetestWorkerService` 经 Job 路径跑批
- [x] `web/src/api.ts` 轮询 job 直至完成（UI 行为不变）
- [x] `npm --prefix backend test` PASS（134 tests）
- [x] `npm --prefix backend run typecheck` PASS
- [x] golden case `diagnostic-batch-api-001.json` 更新为 202
