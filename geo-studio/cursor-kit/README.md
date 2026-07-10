# Cursor Dev Kit — 可移植工程规范包

将 TAEOS 核心开发纪律（SPEC 优先、小步交付、测试与 replay、评审 checklist）**复制到任意项目**，让 Cursor Agent 按同一套流程执行。

> 完整版规范见同目录 `STANDARDS.md`；TAEOS 治理仓完整协议见上级 `docs/ENGINEERING_STANDARDS.md`。

---

## 能做什么 / 不能做什么

| 能力 | 说明 |
|------|------|
| **能做** | 约束 Cursor 每次 task 的启动序列、文件/行数上限、SPEC 格式、测试与 replay、commit 格式、多 Agent 分工 |
| **能做** | 提供 task 卡 / checklist / golden case 模板，Agent 可直接填 |
| **不能做** | 替代项目自身的 CI、测试框架、业务规范——需在 `project.config.yaml` 里声明 |
| **可选** | 若项目也部署了 TAEOS `check_sync.py`，可开启「完整门禁模式」 |

本 kit **不依赖** TAEOS 仓库；拷贝后即可用。

---

## 一分钟安装

### Windows (PowerShell)

```powershell
# 在目标项目根目录执行（将 KIT 换成 cursor-kit 所在路径）
$KIT = "C:\path\to\cursor-kit"
$PROJ = Get-Location

# 1. Cursor 规则与 Agent 工作流（合并，不覆盖已有文件）
Copy-Item -Recurse -Force "$KIT\.cursor\*" "$PROJ\.cursor\"

# 2. 治理目录（仅当不存在时创建）
@("specs", "tasks", "eval\task_validation", "eval\golden_cases\example", "bridge") | ForEach-Object {
  $p = Join-Path $PROJ $_
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

# 3. 模板文件（不覆盖已有）
Copy-Item "$KIT\specs\SPEC-TEMPLATE.yaml" "$PROJ\specs\" -ErrorAction SilentlyContinue
Copy-Item "$KIT\tasks\TASK-TEMPLATE.yaml" "$PROJ\tasks\" -ErrorAction SilentlyContinue
Copy-Item "$KIT\bridge\*" "$PROJ\bridge\" -ErrorAction SilentlyContinue
Copy-Item "$KIT\eval\task_validation\TEMPLATE.checklist.md" "$PROJ\eval\task_validation\" -ErrorAction SilentlyContinue
Copy-Item "$KIT\eval\golden_cases\example\*" "$PROJ\eval\golden_cases\example\" -ErrorAction SilentlyContinue

# 4. 项目配置（首次）
if (-not (Test-Path "$PROJ\project.config.yaml")) {
  Copy-Item "$KIT\project.config.yaml" "$PROJ\"
}

# 5. 可选：轻量 task 校验脚本
if (-not (Test-Path "$PROJ\scripts")) { New-Item -ItemType Directory -Path "$PROJ\scripts" | Out-Null }
Copy-Item "$KIT\scripts\validate_task.py" "$PROJ\scripts\" -ErrorAction SilentlyContinue

Write-Host "Done. Open project in Cursor and run: @.cursor/AGENTS.md 按 SPEC 拆 task"
```

### macOS / Linux

```bash
KIT=/path/to/cursor-kit
PROJ=$(pwd)

mkdir -p .cursor/rules specs tasks eval/task_validation eval/golden_cases/example bridge scripts
cp -rn "$KIT/.cursor/"* .cursor/ 2>/dev/null || cp -r "$KIT/.cursor/"* .cursor/
cp -n "$KIT/specs/SPEC-TEMPLATE.yaml" specs/ 2>/dev/null || true
cp -n "$KIT/tasks/TASK-TEMPLATE.yaml" tasks/ 2>/dev/null || true
cp -n "$KIT/bridge/"* bridge/ 2>/dev/null || true
cp -n "$KIT/eval/task_validation/TEMPLATE.checklist.md" eval/task_validation/ 2>/dev/null || true
cp -n "$KIT/eval/golden_cases/example/"* eval/golden_cases/example/ 2>/dev/null || true
cp -n "$KIT/project.config.yaml" . 2>/dev/null || true
cp -n "$KIT/scripts/validate_task.py" scripts/ 2>/dev/null || true

echo "Done. In Cursor: @.cursor/AGENTS.md"
```

---

## 安装后的目录结构

```text
your-project/
├── .cursor/
│   ├── AGENTS.md              # 多 Agent 分工与 Prompt 模板
│   └── rules/
│       ├── core-workflow.mdc      # 始终生效：启动序列 + R1-R8
│       ├── spec-driven.mdc        # specs/** 编辑时生效
│       ├── task-execution.mdc       # tasks/** 编辑时生效
│       └── testing-replay.mdc       # tests/** eval/** 编辑时生效
├── project.config.yaml        # 项目名、测试命令、服务边界
├── specs/
│   └── SPEC-TEMPLATE.yaml
├── tasks/
│   └── TASK-TEMPLATE.yaml
├── bridge/
│   ├── task_executor_rules.md
│   └── task_router.md
├── eval/
│   ├── task_validation/
│   │   └── TEMPLATE.checklist.md
│   └── golden_cases/
│       └── example/
│           └── example-001.json
├── scripts/
│   └── validate_task.py       # 可选：轻量 task 边界检查
└── STANDARDS.md               # 规范全文（拷贝时可选）
```

---

## Cursor 里怎么用

### 1. 新功能：从 SPEC 开始

```
@.cursor/AGENTS.md @specs/SPEC-TEMPLATE.yaml

我要做 [功能描述]。请：
1. 基于模板创建 specs/SPEC-XXX.yaml
2. 拆成 ≤3 个 task 卡写入 tasks/
3. 输出 plan + risk + affected_files + validation_checklist
等我确认后再改代码。
```

### 2. 执行单个 task

```
@tasks/TASK-XXX.yaml @bridge/task_executor_rules.md

执行本 task。遵守 R1-R8：≤3 文件、≤100 行。
完成后落盘 eval/task_validation/TASK-XXX.checklist.md
若涉业务逻辑，生成 eval/golden_cases/ 下 replay case。
```

### 3. 评审

```
@.cursor/AGENTS.md

Review Agent：检查我最近的 diff 是否满足 SPEC acceptance、测试是否补齐、checklist 是否完整。
```

### 4. 可选校验

```powershell
python scripts/validate_task.py --task tasks/TASK-XXX.yaml
python scripts/validate_task.py --diff  # 检查当前 git diff 行数/文件数
```

---

## 与 TAEOS 完整版的关系

| 维度 | cursor-kit（本包） | TAEOS 完整版（taeos_v1） |
|------|-------------------|-------------------------|
| 适用范围 | 任意项目，拷贝即用 | 仅 taeos_v1 治理仓 |
| 协议体系 | `bridge/` 精简版 + `.cursor/rules` | `protocols/` 全量 + `check_sync.py` |
| 门禁 | Agent 自律 + 可选 `validate_task.py` | pre-commit + 9 validators 硬拦截 |
| 4-model audit | 文档建议，不内置 | `quality_audit_protocol` 强制执行 |

若需要完整机械化门禁，在目标项目接入 TAEOS `scripts/check_sync.py` 与 `validators/`，并在 `project.config.yaml` 设置 `taeos_mode: full`。

---

## 自定义

编辑 `project.config.yaml`：

```yaml
project:
  name: my-app
  test_command: "npm test"          # 或 pytest / unittest
  lint_command: "npm run lint"
services:                           # R6 跨服务禁令的边界
  - backend
  - web
  - agent
limits:
  max_files_per_task: 3
  max_lines_per_task: 100
  max_tasks_per_spec: 3
```

---

## 版本

- Kit version: `v1.0.0`
- 源自: `docs/ENGINEERING_STANDARDS.md`（TAEOS 治理仓）
- 更新日期: 2026-06-11
