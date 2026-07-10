# Validation — TASK-GEO-005

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/src/diagnostics/diagnostic-service.ts
  - backend/src/diagnostics/diagnostic.module.ts
  - backend/src/diagnostics/diagnostic-service.test.ts
- [x] 文件改动数 ≤ 6：3 个（+1 golden case 输出）
- [x] 行变更总数 ≤ 300：约 110 行
- [x] `commands.test` PASS：`npm --prefix backend test` → 5 files / 18 tests passed（diagnostic-service 3 用例）
- [x] typecheck PASS：`tsc --noEmit` 通过
- [x] 无 linter 错误
- [x] replay / golden case：eval/golden_cases/diagnostics/question-set-build-001.json（已知品牌挂 brandId / 未知品牌 / 跨租户均抛 BrandNotFoundError）
- [x] 无跨 service 联动改动（R6）：仅 backend
- [x] plan + risk 已获批准（已收到「批准 TASK-GEO-004-005」）
- [ ] commit message 含 `[type]: [scope]`（待统一提交）

**Result**: PASS

**Notes**:
- `DiagnosticService` 为 `@Injectable` + async，注入现已异步的 `BrandService`；`DiagnosticModule` imports BrandModule、exports DiagnosticService。
- 暂未接入 AppModule/HTTP；诊断端点（GET /brands/:id/questions）留待后续 API SPEC，与 Brand「模型→API」分层一致。
- 单测用 `new BrandService(FakeBrandRepository)` 注入，hermetic，不依赖 DB。
- 未知品牌 / 跨租户读取均抛 `BrandNotFoundError`（领域错误，便于未来 controller 映射为 404）。
