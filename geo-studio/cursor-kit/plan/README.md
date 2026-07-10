# cursor-kit/plan/

机器可读开发计划，与 `docs/DEVELOPMENT-PLAN.md`、`docs/PROGRESS.md` 同步维护。

| 文件 | 说明 |
|------|------|
| `master-plan.yaml` | 阶段、SPEC 队列、依赖、批准状态 |

## 更新规则

1. 新 backlog 项 → 先在 `master-plan.yaml` 登记 → 创建 `specs/SPEC-*.yaml`（`status: PLANNED`）
2. 用户批准开工 → `approved: true`，SPEC `status: ACTIVE`
3. Task 完成 → 更新 `docs/PROGRESS.md` 与本文件中的 `status`

## 禁止

- 无 SPEC 的代码变更（v1 已冻结）
- master-plan 与 PROGRESS 长期不一致
