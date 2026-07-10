# 工程规范（cursor-kit 可移植版）

> 从 TAEOS `docs/ENGINEERING_STANDARDS.md` 提炼，供**任意项目**使用。  
> Cursor 通过 `.cursor/rules/*.mdc` 自动加载；人工速查用本文。

---

## 原则

**SPEC 优先 · 小步交付 · 可审计可复现**

---

## 1. 启动序列

1. 读 `bridge/task_executor_rules.md`、`project.config.yaml`
2. 确认 `tasks/TASK-*.yaml` 已批准
3. 输出 plan + risk + affected_files + validation_checklist
4. 小步改 ≤3 文件、≤100 行
5. 写 checklist + replay（如需）
6. 仅用户要求时 commit

---

## 2. SPEC（`specs/*.yaml`）

| 字段 | 要求 |
|------|------|
| `id` | `SPEC-<SCOPE>-<NNN>` |
| `status` | `ACTIVE` 才可派工 |
| `feature_goal` | 单句、可测试 |
| `affected_files` | 1–9；单 task 仍 ≤3 |
| `validation_rules` | ≥1 |
| `replay_cases` | 业务逻辑 ≥1 |

---

## 3. Task 卡（`tasks/*.yaml`）

| 字段 | 要求 |
|------|------|
| `files_to_touch` | ≤3，**唯一可改路径** |
| `validation` | ≥1 |
| 每 SPEC 子 task | ≤3 |

---

## 4. R1–R8

| 规则 | 内容 |
|------|------|
| R1 | 先读规则与 task 卡 |
| R2 | ≤3 文件 |
| R3 | ≤100 行 diff |
| R4 | 禁止全仓 rewrite |
| R5 | 禁止擅自删文件 |
| R6 | 禁止跨 service 同改 |
| R7 | 必须 checklist |
| R8 | 业务变更须 replay case |

---

## 5. 测试与 Replay

- 新功能/修复：测试与实现同批
- Golden case：`eval/golden_cases/<feature>/*.json`
- 不可删已有 case；改 `expected_output` 须评审

---

## 6. Commit（用户明确要求时）

```
[type]: [scope] - summary

task_id: TASK-XXX
spec_id: SPEC-XXX
files: 1/3
diff: +N -M
```

---

## 7. 校验

```powershell
python scripts/validate_task.py --task tasks/TASK-XXX.yaml
python scripts/validate_task.py --diff
```

---

## 8. 与 TAEOS 完整版差异

本 kit = **Agent 自律 + 模板 + 可选脚本**。  
TAEOS 完整版额外含 `protocols/`、`check_sync.py` 九 validator、pre-commit 硬拦截。  
需要完整门禁时在 `project.config.yaml` 设 `taeos_mode: full` 并接入 TAEOS 校验栈。
