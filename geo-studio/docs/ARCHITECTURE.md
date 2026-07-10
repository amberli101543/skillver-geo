# GEO Studio 架构契约（开发约束）

> **适用范围**：除多租户 / RBAC 外，所有新开发与重构必须遵守本契约。  
> **愿景来源**：[GEO-Studio-产品方案.md](./GEO-Studio-产品方案.md) 第四节。  
> **v1 前提**：单用户、单进程部署可接受；**逻辑分层不可跳过**。

---

## 原则

1. **分层先于实现**：先确定代码属于哪一层，再写代码；禁止「顺手写在 Controller 里」。
2. **依赖单向向下**：上层可调用下层；下层不得 import 上层业务模块（Worker → Diagnostic 除外，见下表）。
3. **连接器隔离外部世界**：所有第三方 API（引擎、CMS、未来爬虫）只出现在连接器层。
4. **AI 集中编排**：LLM 调用、Prompt、未来 RAG 只经 `backend/src/ai/` 对外暴露 Facade；业务模块不得直接 `import llm-client`。
5. **重活走 Worker 抽象**：耗时 >3s 或批量循环的任务，HTTP 层只 **入队/触发**，执行体在 `worker/`（v1 可为同进程 cron，接口须预留 queue）。
6. **数据经 Repository**：Prisma 只在 `*.repository.ts` 与 `prisma/` 模块出现；Service 不直接写 SQL。

---

## 分层与目录映射

| 层 | 职责 | 目录 / 模块 | 禁止 |
|----|------|-------------|------|
| **前端** | 工作台 UI、API 客户端 | `web/src/` | 业务规则、直连 DB |
| **API 边界** | 鉴权、DTO 校验、HTTP 映射 | `auth/`、`common/`、各 `*.controller.ts` | 领域逻辑、LLM、外部 HTTP |
| **核心服务** | 品牌、诊断、矩阵、内容、分发、指标、告警 | `brand/` `diagnostics/` `matrix/` `content/` `distribution/` `metrics/` `alert/` | 直接 LLM、直接第三方 API |
| **AI 编排** | LLM 路由、Pipeline、Prompt、RAG（规划） | `ai/` | 依赖具体 Controller |
| **连接器** | 引擎实测、发布渠道 | `engine/`（引擎）、`distribution/publish-connector.ts` | 被 ai/ 以外的模块绕过 |
| **异步调度** | 定时复测、未来队列消费 | `worker/` | 在 Controller 内写 cron 或大循环 |
| **数据** | 持久化、迁移 | `prisma/`、各 `*.repository.ts` | 在 Service 外散落 Prisma 调用 |

### 允许的跨层依赖（摘要）

```
web → HTTP API
Controller → Service → Repository → Prisma
Controller → Service → Connector / AiFacade
Worker → Service（同核心服务）
engine/scoring/content → ai/（经 Facade，禁止直引 llm-client）
```

---

## 新功能自检（Implementer / Reviewer 必查）

- [ ] 代码落在正确目录；未在 Controller 写业务逻辑
- [ ] 无新增 `import ... from "../ai/llm-client"`（须走 `ai/` Facade）
- [ ] 外部 HTTP 仅在 `engine/` 或 `distribution/publish-connector.ts`
- [ ] 批量/生成/发布若 >3s，经 Worker 或明确标注「同步 v1 例外」并在 SPEC 说明
- [ ] SPEC `affected_files` 标明所属层；跨层拆多个 task（遵守 R6）
- [ ] 跑 `npm --prefix backend run check:architecture`

---

## v1 与目标态差距（可同进程，不可混层）

| 目标态 | v1 现状 | 开发要求 |
|--------|---------|----------|
| API 网关 | Vite 代理 + Nest 直连 | 鉴权统一走 `ApiKeyGuard`；不在各 Controller 重复鉴权 |
| 任务队列 | 仅 cron | 新增长任务须定义 `Job` 接口，Worker 消费；禁止在 HTTP 内扩展循环 |
| 时序库 | PG `MetricSnapshot` | 指标只经 `metrics/` Repository |
| 向量 / RAG | `BrandKnowledgeChunk` + pgvector HNSW；`KnowledgeAiFacade` / `RagService` | 检索与 embedding 只加在 `ai/rag/`；业务经 Facade 同步索引 |
| Job 可观测 | `GET /jobs/stats` + 结构化 job 日志 | 不引入 Prometheus/OTel；Worker 无 HTTP |
| 对象存储 | PG 文本列 | 媒体上传 SPEC 须先定 `storage/` 或 repository 扩展 |
| 多引擎连接器 | OpenAI 代理 | 新引擎 = 新 `EngineConnector` 实现，不改 Diagnostic 核心 |

---

## 已知技术债（ARCH-001 已清）

~~engine/scoring/content 直引 llm-client~~ → 已迁移至 `ai/*.facade.ts`。

**诊断跑批 / 内容生成 / 发布** 已改经 `Job` 表 + `JobRunnerService`（HTTP 202）；复测同路径。BullMQ 见 SPEC-GEO-030。

---

## 与 cursor-kit 的关系

- `project.config.yaml` 的 `services`（web / backend / ai / worker）= **逻辑边界**，单 task 不得跨 service 目录。
- 本文件 = **层内边界**；`npm run check:architecture` 在 CI / task 完成时执行。
- Reviewer 对照本文件打 BLOCKER，而非「能跑就行」。

---

## 演进路线（见 master-plan）

完整队列与依赖：[`cursor-kit/plan/master-plan.yaml`](../cursor-kit/plan/master-plan.yaml) · [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md)

| SPEC | 主题 |
|------|------|
| GEO-ARCH-001 | Ai Facade |
| GEO-ARCH-002 | Job 异步化 |
| GEO-ARCH-003 | RAG |
| GEO-ARCH-004 | 连接器注册表 |

多租户、RBAC、审计 **不在本契约范围**（与单用户前提冲突，见 ROADMAP v2 Backlog）。
