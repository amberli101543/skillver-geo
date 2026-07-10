# API 断点扫描报告

> 扫描日期：2026-06-12  
> 后端：NestJS `@Controller`（默认端口 3000，无全局 `/api` 前缀）  
> 前端：`web/src/api.ts`（默认 `VITE_API_BASE=/api`，开发/预览由 Vite 代理剥离前缀）

## 摘要

| 指标 | 数量 |
|------|------|
| 后端 HTTP 端点 | **46** |
| 前端 `api.ts` 调用 | **42** |
| 前端无对应后端 | **0** |
| 后端未被 UI 使用 | **4**（均为合理保留） |

**结论**：用户向 API 已全部接线；前端 42 条调用均可映射到现有 Nest 路由。SPEC-GEO-026 固定 8 断点 + 其余面板功能均 PASS。

---

## 鉴权

- 全局 `ApiKeyGuard`：设置 `API_AUTH_TOKEN` 后要求请求头 `X-Api-Key`
- 例外：`GET /health`（`@Public()`）
- 前端：`VITE_API_TOKEN` → `X-Api-Key`（见 `web/src/api.ts`）

---

## 后端全量端点（46）

### Health

| Method | Path | 文件 |
|--------|------|------|
| GET | `/health` | `health/health.controller.ts` |

### AI

| Method | Path | 文件 |
|--------|------|------|
| GET | `/ai/status` | `ai/ai.controller.ts` |

### Brands

| Method | Path | 文件 |
|--------|------|------|
| POST | `/brands` | `brand/brand.controller.ts` |
| GET | `/brands` | `brand/brand.controller.ts` |
| GET | `/brands/:id` | `brand/brand.controller.ts` |

### 品牌实体

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:brandId/assertions` | `brand/brand-entity.controller.ts` |
| POST | `/brands/:brandId/assertions` | `brand/brand-entity.controller.ts` |
| DELETE | `/brands/:brandId/assertions/:assertionId` | `brand/brand-entity.controller.ts` |
| GET | `/brands/:brandId/competitors` | `brand/brand-entity.controller.ts` |
| POST | `/brands/:brandId/competitors` | `brand/brand-entity.controller.ts` |
| DELETE | `/brands/:brandId/competitors/:competitorId` | `brand/brand-entity.controller.ts` |

### 诊断

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:id/questions` | `diagnostics/diagnostic.controller.ts` |
| POST | `/brands/:id/diagnostic-runs` | `diagnostics/diagnostic-batch.controller.ts` | body 可选 `{ engineIds?: string[] }` |
| GET | `/brands/:brandId/diagnostic-runs` | `diagnostics/diagnostic-run.controller.ts` |
| GET | `/brands/:brandId/diagnostic-runs/:runId` | `diagnostics/diagnostic-run.controller.ts` |

### 引擎试跑

| Method | Path | 文件 | 说明 |
|--------|------|------|------|
| GET | `/engines` | `engine/engine-registry.controller.ts` | 已注册引擎 capabilities |
| POST | `/brands/:id/engine-tests` | `engine/engine-test.controller.ts` | body 可选 `{ engineId?: string }`；Job 结果 `score.ragSnippets[]` |

### 指标

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:id/metrics` | `metrics/metrics.controller.ts` | query 可选 `engineId`；响应含 `series`（快照聚合）与 `byEngine`（按引擎趋势） |

### 语义矩阵

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:brandId/matrix-cells` | `matrix/matrix.controller.ts` |
| POST | `/brands/:brandId/matrix-cells` | `matrix/matrix.controller.ts` |
| PUT | `/brands/:brandId/matrix-cells/:cellId` | `matrix/matrix.controller.ts` |
| DELETE | `/brands/:brandId/matrix-cells/:cellId` | `matrix/matrix.controller.ts` |
| GET | `/brands/:brandId/matrix-gaps` | `matrix/matrix.controller.ts` |
| POST | `/brands/:brandId/matrix-cells/sync-gaps` | `matrix/matrix.controller.ts` |

### 内容初稿

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:brandId/content-drafts` | `content/content.controller.ts` |
| GET | `/brands/:brandId/matrix-cells/:cellId/content-drafts` | `content/content.controller.ts` |
| GET | `/brands/:brandId/content-drafts/:draftId` | `content/content.controller.ts` | 响应含可选 `ragSnippets[]` |
| POST | `/brands/:brandId/matrix-cells/:cellId/content-drafts/generate` | `content/content.controller.ts` | Job 结果 ContentDraft 含 `ragSnippets[]` |
| PATCH | `/brands/:brandId/content-drafts/:draftId` | `content/content.controller.ts` |
| DELETE | `/brands/:brandId/content-drafts/:draftId` | `content/content.controller.ts` |

### 信源（全局）

| Method | Path | 文件 |
|--------|------|------|
| GET | `/sources` | `distribution/source.controller.ts` |
| POST | `/sources` | `distribution/source.controller.ts` |
| PUT | `/sources/:sourceId` | `distribution/source.controller.ts` |
| DELETE | `/sources/:sourceId` | `distribution/source.controller.ts` |

### 分发与发布

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:brandId/distribution-tasks` | `distribution/distribution.controller.ts` |
| POST | `/brands/:brandId/distribution-tasks` | `distribution/distribution.controller.ts` |
| PATCH | `/brands/:brandId/distribution-tasks/:taskId` | `distribution/distribution.controller.ts` |
| DELETE | `/brands/:brandId/distribution-tasks/:taskId` | `distribution/distribution.controller.ts` |
| GET | `/brands/:brandId/publish-records` | `distribution/distribution.controller.ts` |
| POST | `/brands/:brandId/publish-records` | `distribution/distribution.controller.ts` |
| POST | `/brands/:brandId/distribution-tasks/:taskId/execute` | `distribution/distribution.controller.ts` |

### 告警

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:brandId/alerts` | `alert/alert.controller.ts` |
| PATCH | `/brands/:brandId/alerts/:alertId` | `alert/alert.controller.ts` |
| GET | `/brands/:brandId/alert-thresholds` | `alert/alert.controller.ts` |
| PUT | `/brands/:brandId/alert-thresholds` | `alert/alert.controller.ts` |

### 异步任务

| Method | Path | 文件 | 说明 |
|--------|------|------|------|
| GET | `/jobs/stats` | `worker/job.controller.ts` | 状态计数、queueMode、recentJobs（最近 10 条） |
| GET | `/jobs/:jobId` | `worker/job.controller.ts` | 单任务详情（轮询用） |

### 复测调度

| Method | Path | 文件 |
|--------|------|------|
| GET | `/brands/:brandId/retest-schedule` | `worker/retest-schedule.controller.ts` |
| PUT | `/brands/:brandId/retest-schedule` | `worker/retest-schedule.controller.ts` |

---

## 前端调用映射（42）

| Method | 后端路径 | api.ts 函数 | UI 面板 |
|--------|----------|-------------|---------|
| GET | `/brands` | `fetchBrands` | Dashboard |
| POST | `/brands` | `createBrand` | CreateBrandModal |
| GET | `/brands/:id/metrics` | `fetchBrandMetrics(brandId, engineId?)` | Dashboard |
| POST | `/brands/:id/diagnostic-runs` | `runDiagnosticBatch(brandId, { engineIds? })` | Dashboard |
| GET | `/engines` | `fetchEngineCapabilities` | Dashboard, EngineTestPanel |
| GET | `/brands/:brandId/diagnostic-runs` | `fetchDiagnosticRuns` | DiagnosticRunsPanel |
| GET | `/brands/:brandId/diagnostic-runs/:runId` | `fetchDiagnosticRunDetail` | DiagnosticRunsPanel |
| GET | `/brands/:id/questions` | `fetchQuestions` | DiagnosticRunsPanel |
| POST | `/brands/:id/engine-tests` | `runEngineTest(brandId, question, engineId?)` | EngineTestPanel |
| GET | `/brands/:brandId/competitors` | `fetchCompetitors` | CompetitorPanel |
| POST | `/brands/:brandId/competitors` | `addCompetitor` | CompetitorPanel |
| DELETE | `/brands/:brandId/competitors/:id` | `deleteCompetitor` | CompetitorPanel |
| GET | `/brands/:brandId/assertions` | `fetchAssertions` | AssertionsPanel, MatrixPanel |
| POST | `/brands/:brandId/assertions` | `addAssertion` | AssertionsPanel |
| DELETE | `/brands/:brandId/assertions/:id` | `deleteAssertion` | AssertionsPanel |
| GET | `/brands/:brandId/retest-schedule` | `fetchRetestSchedule` | RetestPanel |
| PUT | `/brands/:brandId/retest-schedule` | `updateRetestSchedule` | RetestPanel |
| GET | `/brands/:brandId/matrix-cells` | `fetchMatrixCells` | MatrixPanel |
| POST | `/brands/:brandId/matrix-cells` | `createMatrixCell` | MatrixPanel |
| PUT | `/brands/:brandId/matrix-cells/:cellId` | `updateMatrixCell` | MatrixPanel |
| DELETE | `/brands/:brandId/matrix-cells/:cellId` | `deleteMatrixCell` | MatrixPanel |
| GET | `/brands/:brandId/matrix-gaps` | `fetchMatrixGaps` | MatrixPanel |
| POST | `/brands/:brandId/matrix-cells/sync-gaps` | `syncMatrixGaps` | MatrixPanel |
| GET | `/brands/:brandId/content-drafts` | `fetchContentDrafts` | MatrixPanel, DistributionPanel |
| GET | `/brands/:brandId/matrix-cells/:cellId/content-drafts` | `fetchCellContentDrafts` | MatrixPanel |
| POST | `.../content-drafts/generate` | `generateContentDraft` | MatrixPanel |
| PATCH | `/brands/:brandId/content-drafts/:draftId` | `updateContentDraft` | DraftEditor, MatrixPanel |
| DELETE | `/brands/:brandId/content-drafts/:draftId` | `deleteContentDraft` | DraftEditor |
| GET | `/sources` | `fetchSources` | DistributionPanel |
| POST | `/sources` | `createSource` | DistributionPanel |
| PUT | `/sources/:sourceId` | `updateSource` | DistributionPanel |
| DELETE | `/sources/:sourceId` | `deleteSource` | DistributionPanel |
| GET | `/brands/:brandId/distribution-tasks` | `fetchDistributionTasks` | DistributionPanel |
| POST | `/brands/:brandId/distribution-tasks` | `createDistributionTask` | DistributionPanel |
| PATCH | `/brands/:brandId/distribution-tasks/:taskId` | `updateDistributionTask` | DistributionPanel |
| POST | `.../distribution-tasks/:taskId/execute` | `executeDistributionTask` | DistributionPanel |
| GET | `/brands/:brandId/publish-records` | `fetchPublishRecords` | DistributionPanel |
| POST | `/brands/:brandId/publish-records` | `createPublishRecord` | DistributionPanel |
| GET | `/jobs/stats` | `fetchJobStats` | JobQueuePanel |
| GET | `/jobs/:jobId` | `fetchJob` | api 内部轮询 |
| GET | `/brands/:brandId/alerts` | `fetchAlerts` | AlertsPanel |
| PATCH | `/brands/:brandId/alerts/:alertId` | `updateAlert` | AlertsPanel |
| GET | `/brands/:brandId/alert-thresholds` | `fetchAlertThresholds` | AlertsPanel |
| PUT | `/brands/:brandId/alert-thresholds` | `updateAlertThresholds` | AlertsPanel |
| GET | `/ai/status` | `fetchAiStatus` | Dashboard |

> `downloadExportManuscript` 为纯客户端 Blob 下载，无 HTTP 端点。

---

## SPEC-GEO-026 固定 8 断点

| # | 端点 | 面板 | 状态 |
|---|------|------|------|
| 1 | assertions CRUD | AssertionsPanel | ✅ |
| 2 | retest-schedule GET/PUT | RetestPanel | ✅ |
| 3 | engine-tests POST | EngineTestPanel | ✅ |
| 4 | content-drafts PATCH | DraftEditor | ✅ |
| 5 | matrix-cells PUT | MatrixPanel | ✅ |
| 6 | sources PUT | DistributionPanel | ✅ |
| 7 | content-drafts DELETE | MatrixPanel | ✅ |
| 8 | questions GET 预览 | DiagnosticRunsPanel | ✅ |

---

## 后端未接 UI 的端点（4）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/health` | 运维探活，非用户功能 |
| GET | `/brands/:id` | 单品牌查询；UI 用列表缓存 |
| GET | `/brands/:brandId/content-drafts/:draftId` | 单稿查询；UI 用列表/展开 |
| DELETE | `/brands/:brandId/distribution-tasks/:taskId` | 硬删除；UI 用 PATCH 取消 |

---

## 生产部署注意

前端默认请求 `/api/*`。开发/本地预览由 Vite 代理到 `:3000`。真实上线需在反向代理（Nginx/Caddy）配置同等 rewrite，或构建时设置 `VITE_API_BASE=https://api.example.com`。
