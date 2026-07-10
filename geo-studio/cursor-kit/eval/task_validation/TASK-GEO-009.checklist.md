# Validation — TASK-GEO-009

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/package.json
  - backend/src/main.ts
  - backend/src/app.module.ts
  - backend/src/brand/brand.module.ts
  - backend/src/brand/brand.controller.ts
  - backend/src/brand/dto/create-brand.dto.ts
- [x] 文件改动数 ≤ 6：6 个
- [x] 行变更总数 ≤ 300：约 150 行
- [x] typecheck PASS：`tsc --noEmit` 通过；`nest build` 通过
- [x] `commands.test` PASS：`npm --prefix backend test` → 8 passed（无回归）
- [x] 端到端实测（docker postgres @5433 + node dist/main.js）：
  - POST /brands (x-tenant-id: t1) → 201，返回含 DB 生成 UUID 的品牌
  - GET /brands/:id → 200
  - GET /brands/未知 → 404
  - POST 缺字段(name:"") → 400（ValidationPipe）
- [x] replay：声明 `replay_exempt`（端到端 replay 由 TASK-GEO-010 e2e + golden 落，避免重复）
- [x] 无跨 service 联动改动（R6）：仅 backend
- [x] plan + risk 已获批准（已收到「批准 TASK-GEO-009-010」）
- [ ] commit message 含 `[type]: [scope]`（待统一提交）

**Result**: PASS

**Notes**:
- AppModule 从 main.ts 内联抽出为 src/app.module.ts，导入 PrismaModule(@Global)+BrandModule，保留 HealthController；main.ts 启用全局 ValidationPipe(whitelist+transform)。
- 租户暂走请求头 x-tenant-id（占位，真正鉴权见后续 SPEC-GEO-005）。
- 错误映射：DTO 非法 → 400（ValidationPipe）；BrandValidationError → 400；GET 未命中 → 404；缺租户头 → 400。
- 新依赖：class-validator + class-transformer。
- 排障记录：首次 smoke 命中残留的 health-only 旧进程（端口 3000 EADDRINUSE），清理端口后复测通过；新进程路由表已正确 Mapped {/brands, POST} 与 {/brands/:id, GET}。
