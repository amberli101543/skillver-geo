# 部署指南

## 环境要求

- Node.js 20+
- Docker（**pgvector** PostgreSQL 16 + Redis，见 `backend/docker-compose.yml`）
- 可选：`OPENAI_API_KEY` 启用真实 LLM

> **pgvector**：自 Phase 5（GEO-036）起，开发库使用 `pgvector/pgvector:pg16` 镜像。若从旧版 `postgres:16-alpine` 升级，需重建 volume 或手动安装 `vector` 扩展。

## 1. 配置

```bash
cp backend/.env.example backend/.env
```

默认 `DATABASE_URL` 指向 `localhost:5433`（docker-compose 映射）。

可选环境变量：

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | 3000 | API 进程 HTTP 端口 |
| `PROCESS_ROLE` | `all`（main）/ `worker`（worker-main） | `api` 仅 HTTP；`worker` 仅队列消费；`all` 单进程开发 |
| `REDIS_URL` | — | 启用 BullMQ（如 `redis://127.0.0.1:6379`） |
| `JOB_QUEUE_MODE` | 自动 | `inline` 无 Redis；`bullmq` 强制队列 |
| `API_AUTH_TOKEN` | 未设置则不鉴权 | 生产必填；亦作 JWT 签名后备 |
| `STUDIO_USERNAME` | `admin` | 看板登录用户名 |
| `STUDIO_PASSWORD` | — | 看板登录密码（生产必填） |
| `JWT_SECRET` | 同 `API_AUTH_TOKEN` | 登录会话签名密钥 |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS 允许来源 |
| `OPENAI_API_KEY` | — | 真实引擎/评分/内容生成 |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | RAG 向量模型 |
| `OPENAI_EMBEDDING_DIMENSIONS` | `1536` | pgvector 列维度，须与模型一致 |
| `ALERT_WEBHOOK_URL` | — | 告警 Webhook 默认 URL（可被看板覆盖） |
| `ALERT_SMTP_HOST` | — | 配置后邮件外推走 SMTP；否则 stub 日志 |

AI 与告警外推可在看板设置面板保存（写入数据库），无需改 `.env` 或重启。

## 2. 开发模式（单进程）

```bash
npm --prefix backend run db:up
npm --prefix backend exec prisma migrate deploy
npm --prefix backend run prisma:generate

# API + Worker 合一（PROCESS_ROLE=all）
npm --prefix backend run start:dev

npm --prefix web run dev
# → http://localhost:5173
```

## 3. 双进程部署（生产推荐）

API 与 Worker 分离，共享 PostgreSQL + Redis：

```bash
npm --prefix backend run db:up
npm --prefix backend exec prisma migrate deploy
npm --prefix backend run prisma:generate
npm --prefix backend run build
```

**终端 1 — API**（仅 HTTP，BullMQ 生产者）：

```powershell
$env:PROCESS_ROLE="api"
$env:REDIS_URL="redis://127.0.0.1:6379"
$env:WEB_ORIGIN="http://localhost:4173"
npm --prefix backend run start:prod
```

**终端 2 — Worker**（BullMQ 消费者 + 定时复测，**无 HTTP 监听**）：

```powershell
$env:REDIS_URL="redis://127.0.0.1:6379"
npm --prefix backend run start:worker:prod
# 默认 PROCESS_ROLE=worker；进程为 ApplicationContext，不暴露 REST
```

开发时 Worker 热重载：

```bash
npm --prefix backend run start:worker:dev
```

### 进程职责

| 进程 | 入口 | HTTP | 职责 |
|------|------|------|------|
| API | `dist/main.js` | ✅ `:PORT` | REST API、Job 入队、`GET /jobs/stats`、Retest 计划 CRUD |
| Worker | `dist/worker-main.js` | ❌ | BullMQ 消费、Job 执行、Retest cron；启动日志 `worker.ready` |

### 可观测（Job 基线）

| 端点 / 日志 | 说明 |
|-------------|------|
| `GET /health` | API 进程存活（Worker 无 HTTP，勿 curl Worker 端口） |
| `GET /jobs/stats` | Job 状态计数（pending/running/completed/failed）+ BullMQ queue depth |
| 结构化日志 | `job.dispatched` / `job.started` / `job.completed` / `job.failed`（JSON，含 jobId、type、durationMs） |

## 4. 本地生产模拟

```powershell
.\scripts\deploy-local.ps1
```

或手动构建前端预览（见原流程）；API/Worker 按上一节双进程启动。

### 冒烟验证

```bash
curl http://localhost:3000/health
curl http://localhost:3000/jobs/stats
curl -H "X-Api-Key: dev-key" http://localhost:3000/brands
```

## 5. 真实生产建议

| 组件 | 建议 |
|------|------|
| 数据库 | 托管 PostgreSQL |
| 队列 | 托管 Redis；`REDIS_URL` + `JOB_QUEUE_MODE=bullmq` |
| API | `PROCESS_ROLE=api` + `node dist/main`，PM2/systemd |
| Worker | 可水平扩展多实例 `node dist/worker-main` |
| 前端 | `vite build` → Nginx 静态托管 |
| 告警外推 | 看板配置 Webhook；或 `ALERT_WEBHOOK_URL` 默认值 |

## 6. 回归测试（发布前）

```bash
npm --prefix backend run prisma:generate
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix web run build
```
