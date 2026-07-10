# Validation — TASK-GEO-013

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/src/diagnostics/diagnostic.controller.e2e.test.ts
- [x] 文件改动数 ≤ 6：1 个（+1 golden case 输出）
- [x] 行变更总数 ≤ 300：约 75 行
- [x] `commands.test` PASS：`npm --prefix backend test` → 6 files / 21 tests passed（含 diagnostic e2e 3 用例，无需 DB）
- [x] typecheck PASS：`tsc --noEmit` 通过
- [x] replay / golden case：eval/golden_cases/diagnostics/diagnostics-api-001.json（GET 200 含四类+brandId / 未知 404 / 缺租户 400）
- [x] 无跨 service 联动改动（R6）：仅 backend
- [x] plan + risk 已获批准（已收到「批准 TASK-GEO-012-013」）
- [ ] commit message 含 `[type]: [scope]`（待统一提交）

**Result**: PASS

**Notes**:
- e2e 用 Nest `TestingModule` 将 `BrandRepository` 覆盖为内存假实现，hermetic、CI 不依赖数据库。
- 复用 TASK-GEO-010 已配置的 `unplugin-swc`（vitest.config.ts），无新依赖。
- 测试覆盖：200（含四类问题 + 每条带 brandId）、404（未知品牌）、400（缺 x-tenant-id）。
