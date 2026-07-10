# Validation — TASK-GEO-004

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/src/diagnostics/question.ts
  - backend/src/diagnostics/question.test.ts
- [x] 文件改动数 ≤ 6：2 个（+1 golden case 输出）
- [x] 行变更总数 ≤ 300：约 75 行
- [x] `commands.test` PASS：`npm --prefix backend test` → 5 files / 18 tests passed（question.test 4 用例）
- [x] typecheck PASS：`tsc --noEmit` 通过
- [x] 无 linter 错误
- [x] replay / golden case：eval/golden_cases/diagnostics/questions-gen-001.json
- [x] 无跨 service 联动改动（R6）：仅 backend
- [x] plan + risk 已获批准（已收到「批准 TASK-GEO-004-005」）
- [ ] commit message 含 `[type]: [scope]`（待统一提交）

**Result**: PASS

**Notes**:
- `generateQuestionSet` 为纯函数，无 Nest 依赖：恒含 category + brand 两类；attribute 随 attributes 生成；comparison 随 competitors 生成（无 competitors 则跳过对比类）。
- 输入空白项（trim 后为空）被忽略，保证 golden 复现稳定。
- 问题文案为确定性中文模板占位（后续可迁 AI 编排层提示词资产）。
