# task_router（cursor-kit 精简版）

## 任务卡格式

```yaml
task_id: TASK-XXX-001
spec_id: SPEC-XXX-001
goal: "可验证的一句话结果"
files_to_touch:
  - path/to/file1
validation:
  - "<test command> PASS"
  - "checklist complete"
approval_required: false
replay_exempt: ""   # 可选；纯结构变更时填写
```

## 约束

| 字段 | 规则 |
|------|------|
| `files_to_touch` | ≤ 3 |
| `spec_id` | 必须存在且 `status: ACTIVE`（`PLANNED` 不可开工） |
| `validation` | ≥ 1 条可执行检查 |
| 每 SPEC 子 task 数 | ≤ 3 |

## SPEC → Task 流程

```text
docs/DEVELOPMENT-PLAN.md + master-plan.yaml（backlog）
  → specs/SPEC-*.yaml（PLANNED → 用户批准 → ACTIVE）
  → 拆 ≤3 张 tasks/TASK-*.yaml
  → Cursor 按 task_executor_rules 执行
  → 更新 docs/PROGRESS.md + checklist + replay
  → SPEC 标记 DONE
```

`status: PLANNED` 的 SPEC 不可拆 task；须 `approved: true` 且 `ACTIVE`。
