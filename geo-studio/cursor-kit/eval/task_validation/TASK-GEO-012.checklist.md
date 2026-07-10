# Validation — TASK-GEO-012

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/src/app.module.ts
  - backend/src/diagnostics/diagnostic.module.ts
  - backend/src/diagnostics/diagnostic.controller.ts
- [x] 文件改动数 ≤ 6：3 个
- [x] 行变更总数 ≤ 300：约 70 行
- [x] typecheck PASS：`tsc --noEmit` 通过；`nest build` 通过
- [x] `commands.test` PASS：`npm --prefix backend test` → 21 passed（无回归）
- [x] 端到端路由已注册：DiagnosticController {/brands/:id/questions} GET（nest build 日志确认）
- [x] replay：声明 `replay_exempt`（HTTP replay 由 TASK-GEO-013 e2e + golden 覆盖）
- [x] 无跨 service 联动改动（R6）：仅 backend
- [x] plan + risk 已获批准（已收到「批准 TASK-GEO-012-013」）
- [ ] commit message 含 `[type]: [scope]`（待统一提交）

**Result**: PASS

**Notes**:
- `GET /brands/:id/questions`：租户走 `x-tenant-id` 头；`competitors`/`attributes` 逗号分隔查询参数；`BrandNotFoundError` → 404；缺租户头 → 400。
- `AppModule` 导入 `DiagnosticModule`；`DiagnosticModule` 注册 `DiagnosticController`。
- 本地 live smoke 曾因端口 3000 残留旧进程 EADDRINUSE 失败；hermetic e2e（TASK-GEO-013）已覆盖 HTTP 行为。
