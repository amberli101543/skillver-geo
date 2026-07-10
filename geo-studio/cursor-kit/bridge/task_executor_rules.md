# task_executor_rules（cursor-kit 精简版）

> 单 task 执行约束。完整版见 TAEOS `bridge/task_executor_rules.md`。

## R1 — 先读规则

开工前读：`bridge/task_executor_rules.md`、`project.config.yaml`、对应 `tasks/*.yaml`。

## R2 — 文件上限

单 task 改动 **≤ 3** 个文件（`files_to_touch` 白名单）。

## R3 — 行数上限

单 task diff **≤ 100** 行（增+改+删）。

## R4 — 禁止全仓改写

禁止 Composer 级联编辑、Accept All、无边界重构。

## R5 — 禁止擅自删文件

删除须显式列入 task 卡 `files_to_touch`（标注 delete）。

## R6 — 禁止跨服务联动

单 task 不得同时改 `project.config.yaml` 中多个 `services` 目录。

## R7 — Validation Checklist

完成时落盘 `eval/task_validation/<task_id>.checklist.md`。

## R8 — Replay Case

业务逻辑 / API 行为 / Prompt 变更 → `eval/golden_cases/` 至少 1 条。
纯结构变更可在 task 注明 `replay_exempt` 理由。

## R9 — 架构分层（除多租户外强制）

开工前读 `docs/ARCHITECTURE.md` 与 `.cursor/rules/architecture-layers.mdc`。

- 新代码必须落在正确层目录；禁止 Controller 写业务 / LLM / Prisma
- 禁止在 `ai/` 以外新增 `llm-client` 直引（存量三文件为冻结技术债）
- 外部 API 只在连接器层；重活走 Worker 抽象
- task 完成时跑 `npm --prefix backend run check:architecture`（或 `project.config.yaml` `commands.architecture`）

## 启动序列

```text
1. 确认 task 卡已批准
2. 输出 plan + risk + affected_files + validation_checklist
3. 小步改 ≤3 文件 ≤100 行
4. 跑 tests + 写 checklist + replay（如需）
5. 仅当用户要求时 commit
```
