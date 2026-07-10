# GEO Studio 开发文档

本目录为 **GEO Studio** 的人类可读开发文档中心。机器可执行的 SPEC / Task / Golden Case 在 `cursor-kit/`。

## 开发入口（v1 之后从这里开始）

| 文档 | 说明 |
|------|------|
| [**DEVELOPMENT-PLAN.md**](./DEVELOPMENT-PLAN.md) | **总计划**：阶段、依赖、工作流、SPEC 队列 |
| [**PROGRESS.md**](./PROGRESS.md) | **活进度**：当前焦点、进行中 Task、阻塞项 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 分层架构契约（Implementer/Reviewer 必读） |
| [CONNECTORS.md](./CONNECTORS.md) | 引擎/发布连接器能力矩阵 |

机器可读：[`cursor-kit/plan/master-plan.yaml`](../cursor-kit/plan/master-plan.yaml)

## 文档索引

| 文档 | 说明 |
|------|------|
| [**GEO-Studio-产品文档.md**](./GEO-Studio-产品文档.md) | **当前已交付版本**：功能、界面、工作流（推荐阅读） |
| [ROADMAP.md](./ROADMAP.md) | 产品路线、v1 状态、v2 Backlog |
| [API-ENDPOINTS.md](./API-ENDPOINTS.md) | 前后端 API 断点对照（2026-06-12 扫描） |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 本地开发与生产模拟部署 |
| [GEO-Studio-产品方案.md](./GEO-Studio-产品方案.md) | 产品定位与功能方案（战略版） |
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | **架构契约**：分层边界、开发约束、技术债（Implementer/Reviewer 必读） |
| [designrefer.md](./designrefer.md) | UI 视觉参考（MongoDB 风格 token） |
| [STANDARDS.md](./STANDARDS.md) | 工程规范（cursor-kit 可移植版） |
| [checklists/](./checklists/) | v1 验收 checklist |

## 相关目录

- `backend/` — NestJS API + Prisma
- `web/` — React 看板（Vite）
- `cursor-kit/specs/` — SPEC YAML
- `cursor-kit/tasks/` — Task 卡
- `cursor-kit/eval/` — Golden cases 与 checklist 源文件

## 快速启动

详见 **[docs/LOCAL-SETUP.md](../docs/LOCAL-SETUP.md)**（本地环境 + 引擎 Key 配置）。

```bash
# 一键配置（Windows）
.\scripts\setup-local.ps1

# 或手动
npm --prefix backend run db:up
npm --prefix backend exec prisma migrate deploy
npm --prefix backend run start:dev   # :3000
npm --prefix web run dev           # :5173
```
