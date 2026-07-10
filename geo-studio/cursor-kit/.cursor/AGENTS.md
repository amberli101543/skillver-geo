# Cursor Multi-Agent Workflow

> 配套 `cursor-kit` · SPEC 优先 · 小步交付 · 可审计

## 角色

### Planner（Task Agent）
**何时**：新功能 / 新 session 开始 / 收到模糊需求  
**职责**：
- 读 `docs/DEVELOPMENT-PLAN.md`、`cursor-kit/plan/master-plan.yaml`、对应 `specs/*.yaml`
- 拆成 ≤3 张 `tasks/*.yaml`；更新 `docs/PROGRESS.md`
- 输出 **plan + risk + affected_files + validation_checklist**（四件套）
- **等用户确认后再写代码**

**Prompt**：
```
你是 Planner。读 @specs/<SPEC>.yaml 和 @bridge/task_router.md。
拆成 ≤3 个 task 卡写入 tasks/，每个 task files_to_touch ≤3。
输出四件套，不要改代码。
```

### Implementer（Dev Agent）
**何时**：用户批准 task 卡后  
**职责**：
- 只改 `files_to_touch` 列出的文件
- 遵守 R1–R8（见 @bridge/task_executor_rules.md）
- 完成 checklist + replay case（若涉业务逻辑）

**Prompt**：
```
执行 @tasks/<TASK>.yaml。遵守 bridge/task_executor_rules R1-R8。
小步改 ≤3 文件 ≤100 行。完成后写 eval/task_validation/<task_id>.checklist.md。
```

### Reviewer（Review Agent）
**何时**：每个 task 完成后 / PR 前  
**职责**：
- 对照 SPEC `feature_goal` 与 task `validation`
- 检查测试、replay、checklist、commit message
- 跨模型评审：建议用与 Implementer **不同系列** 的模型

**Prompt**：
```
Review Agent：审查最近 diff。@specs/ @tasks/ @eval/task_validation/
检查：范围是否越界、测试是否补齐、golden case 是否需要更新。
列出 BLOCKER / SUGGESTION。
```

### Researcher（Query Agent）
**何时**：「这段代码在哪」「X 怎么工作」  
**职责**：只读探索，不改代码

---

## 标准循环

```text
需求 → 查 docs/DEVELOPMENT-PLAN.md + PROGRESS.md
  → 批准 SPEC（PLANNED → ACTIVE）→ Planner 拆 ≤3 task
  → 用户批准 → Implementer 执行单 task（≤3 文件 ≤100 行）
  → 更新 PROGRESS.md + master-plan.yaml
  → Reviewer 评审
  → 重复直至 SPEC 全部 task 完成
  → 用户明确要求时才 git commit
```

---

## 硬约束速查（Agent 必须遵守）

| 规则 | 要求 |
|------|------|
| R1 | 开工前读 `bridge/task_executor_rules.md` + 本文件 |
| R2 | 单 task ≤ **3** 个文件 |
| R3 | 单 task diff ≤ **100** 行 |
| R4 | 禁止全仓 rewrite / Accept All |
| R5 | 禁止删除未在 task 卡声明的文件 |
| R6 | 禁止单 task 跨 `project.config.yaml` 中多个 service |
| R7 | 必须输出 validation checklist |
| R8 | 业务逻辑变更必须 ≥1 golden/replay case |
| R9 | 遵守 `docs/ARCHITECTURE.md` 分层；跑 `check:architecture` |

---

## Quick Start

1. 用 Cursor 打开已安装 kit 的项目
2. `@.cursor/AGENTS.md @specs/SPEC-TEMPLATE.yaml` — 描述要做的功能
3. 确认 Planner 产出的 task 卡
4. `@tasks/TASK-001.yaml` — 执行实现
5. `@.cursor/AGENTS.md Review` — 评审
6. 可选：`python scripts/validate_task.py --task tasks/TASK-001.yaml`
