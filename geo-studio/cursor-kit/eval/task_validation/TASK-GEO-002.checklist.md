# Validation — TASK-GEO-002

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/src/brand/brand.ts
  - backend/src/brand/brand.test.ts
- [x] 文件改动数 ≤ 3：2 个源文件（+1 golden case 输出）
- [x] 行变更总数 ≤ 100：约 63 行（brand.ts ~35 + brand.test.ts ~28）
- [x] `project.config.yaml` commands.test PASS：`npm test -- brand.test` → 4 passed
- [x] lint / typecheck PASS（若项目配置了）：无 linter 错误
- [x] replay / golden case 已更新或已声明 replay_exempt：eval/golden_cases/brand/brand-validate-001.json（合法通过 / 缺字段 / 空白值）
- [x] 无跨 service 联动改动（R6）：仅 backend 单一 service
- [x] plan + risk 已在 session 中输出并获批准（已收到「批准 TASK-GEO-002」）
- [ ] commit message 含 `[type]: [scope]`（仅当用户要求 commit 时）：用户尚未要求 commit

**Result**: PASS

**Notes**:
- `validateBrand` 返回结构化错误数组（field + message），便于上层 API 透出；必填字段 tenantId/name/definition，name 上限 120 字符。
- golden case `brand-validate-001` 覆盖：合法、全缺、空白值三类。
