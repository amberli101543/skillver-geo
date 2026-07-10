# GEO Studio

企业品牌 AI 可见度运营中台 — 诊断、内容生产、分发与监测一体化看板。

## 仓库结构

```
backend/     NestJS API + Prisma + PostgreSQL
web/         React 看板 (Vite)
docs/        开发文档（路线、API、部署、产品方案）
cursor-kit/  SPEC / Task / 验证工具链
scripts/     部署与运维脚本
```

## 快速开始

```bash
npm --prefix backend run db:up
npm --prefix backend exec prisma migrate deploy
npm --prefix backend run start:dev   # :3000
npm --prefix web run dev           # :5173
```

完整说明见 **[docs/README.md](./docs/README.md)**。

## 文档

- [**开发总计划**](./docs/DEVELOPMENT-PLAN.md) · [进度](./docs/PROGRESS.md)
- [开发路线](./docs/ROADMAP.md)
- [架构契约](./docs/ARCHITECTURE.md)
- [API 断点对照](./docs/API-ENDPOINTS.md)
- [部署指南](./docs/DEPLOYMENT.md)
- [产品文档](./docs/GEO-Studio-产品文档.md)
- [产品方案](./docs/GEO-Studio-产品方案.md)
