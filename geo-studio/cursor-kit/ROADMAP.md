# GEO Studio 开发路线（单用户 · 一体化完整产品）

> **统筹入口**：[`docs/DEVELOPMENT-PLAN.md`](../docs/DEVELOPMENT-PLAN.md) · [`docs/PROGRESS.md`](../docs/PROGRESS.md)  
> **v1 历史**：[`docs/ROADMAP.md`](../docs/ROADMAP.md) — 本文件保留供 cursor-kit 工具链引用。

> 原则：单用户（无多租户）、一次做完整产品（不分 MVP/V1/V2 阶段交付）、按模块依赖排序而非工期估算。
> 工作流沿用 cursor-kit：SPEC → ≤3 task → 实现 → 验证 → checklist。
>
> **范围冻结（2026-06-12）**：模块 SPEC GEO-001~025 已完结。产品 v1 收官仅交付 **SPEC-GEO-026**（见 `SPEC-GEO-PROD-001` DoD）。v1 完成后新需求进 **v2 Backlog**，需明确批准才开 GEO-027+。

## 目标闭环

```
建品牌 → 诊断实测 → 看缺口 → 生成内容 → 发布到信源 → 定时复测 → 趋势/告警
   ↑________________________________________________________________|
```

## 产品 v1 状态

| 阶段 | 状态 |
|------|------|
| 模块能力 GEO-001 ~ 025 | ✅ 已完成 |
| 产品 DoD 定义 SPEC-GEO-PROD-001 | ✅ 已完成 |
| UI 补全 + AI 前台化 SPEC-GEO-026 | ✅ 已完成（`e4967b9`） |
| **产品 v1 整体** | ✅ **DONE**（2026-06-12） |

新需求一律进下方 **v2 Backlog**，需明确批准才开 SPEC-GEO-027+。

## 产品 v1 Definition of Done（摘要）

完整条文见 [`specs/SPEC-GEO-PROD-001.yaml`](specs/SPEC-GEO-PROD-001.yaml)。

1. **用户旅程**：建品牌 → 录入断言 → 跑批/单题试跑 → 缺口/矩阵 → 生成并**编辑**初稿 → 分发 → **配置复测** → 趋势/告警 — 全程可在看板操作。
2. **API Parity**：用户向 controller 端点在 `web/src/api.ts` 有 fetch，且至少一处 UI 可触发（health 除外）。
3. **AI 前台化**：状态可见、单题可试跑、内容路径提示断言、明细可感知 scoring 模式。
4. **工程质量**：backend test/typecheck + web build PASS。

## 已完成（SPEC-GEO-001 ~ 025）

- Brand 创建/读取/列表
- 诊断问题集生成、代理引擎实测、规则评分
- 一键跑批 + 基线指标入库（DiagnosticRun / MetricSnapshot）
- Web 看板：折线趋势、跑批、多品牌、创建品牌
- **GEO-014** 单用户化
- **GEO-015** 诊断明细持久化（Question / EngineTest / TestScore + GET 跑批明细 API）
- **GEO-016** 品牌实体扩展（Assertion / Competitor CRUD）+ 跑批 runAndPersist 事务化
- **GEO-017** 定时复测 Worker（RetestSchedule + 每分钟 cron 跑批）
- **GEO-018** 看板跑批明细与竞品对标 UI
- **GEO-019** 语义矩阵 MatrixCell CRUD + 诊断缺口 sync API
- **GEO-020** ContentDraft 初稿生成 + 看板语义矩阵 UI
- **GEO-021** 信源 Source + 分发任务 + 发布记录 API
- **GEO-022** 发布连接器（CMS 自动发布 + export/manual 导出稿件）+ 看板执行 UI
- **GEO-023** 监测告警（错误信息检测 + 阈值/跌幅告警 + 看板 AlertsPanel）
- **GEO-024** 真实引擎连接器规范化（共享 LLM 客户端、版本化 prompt、`GET /ai/status`）
- **GEO-025** LLM 评分流水线（有 Key 走 LLM，失败回退规则 stub）

## 目标数据模型（Prisma 最终态）

```
Brand ──< Assertion
      ──< Competitor
      ──< Question
      ──< MatrixCell ──< ContentDraft
      ──< DiagnosticRun ──< MetricSnapshot
Question ──< EngineTest ──1 TestScore
Source ──< DistributionTask ──< PublishRecord
```

所有表移除 tenantId（单用户）。

## SPEC 计划（按依赖顺序）

### 阶段 A — 地基
| SPEC | 主题 |
|------|------|
| GEO-014 | 单用户化：移除 x-tenant-id / tenantId 全栈 + 抽公共 helper |
| GEO-015 | 诊断明细持久化：Question / EngineTest / TestScore 入库 |
| GEO-016 | 跑批事务化 + 品牌实体扩展（Assertion / Competitor） |

### 阶段 B — 自动化与可视化
| SPEC | 主题 |
|------|------|
| GEO-017 | 定时复测 Worker（调度器 + 跑批任务，可配频率） |
| GEO-018 | 看板明细与竞品对标（单次跑批详情、每题评分） |

### 阶段 C — 内容生产
| SPEC | 主题 |
|------|------|
| GEO-019 | ~~语义矩阵 MatrixCell CRUD + 诊断缺口联动~~ ✅ |
| GEO-020 | ~~内容初稿生成（LLM）+ ContentDraft 内容库~~ ✅ |

### 阶段 D — 分发与监测
| SPEC | 主题 |
|------|------|
| GEO-021 | ~~信源与分发：Source / DistributionTask / PublishRecord~~ ✅ |
| GEO-022 | ~~发布连接器：自有 CMS 自动发布 + 无接口渠道导出稿~~ ✅ |
| GEO-023 | ~~监测告警：错误信息检测 + 阈值告警~~ ✅ |

### 阶段 E — AI 能力升级（可穿插）
| SPEC | 主题 |
|------|------|
| GEO-024 | ~~真实引擎连接器（有 Key 走真实 LLM，stub 回退）~~ ✅ |
| GEO-025 | ~~LLM 评分流水线（替代规则 stub，prompt 可版本化）~~ ✅ |

### 阶段 F — 产品 v1 收官（✅ 已完成）
| SPEC | 主题 |
|------|------|
| GEO-PROD-001 | 产品 v1 DoD + 范围冻结规则 |
| GEO-026 | UI 补全 + AI 前台化（固定 8 断点，≤3 task） |

#### SPEC-GEO-026 Task 卡
| Task | 内容 |
|------|------|
| TASK-GEO-054 | Assertion 面板 + 复测调度面板 |
| TASK-GEO-055 | 引擎单题试跑 + AI 设置 + 评分明细标注 |
| TASK-GEO-056 | 初稿编辑器 + matrix/source/draft/questions API parity |

## 本地运行（v1 验收）

```bash
# 后端（默认 API_KEY=dev-key，可用 .env 覆盖）
npm --prefix backend run start:dev

# 前端
npm --prefix web run dev
# 浏览器 http://localhost:5173
# web/.env.local: VITE_API_TOKEN=<与后端 API_KEY 一致>
```

可选 AI env（见看板「AI 设置」）：`OPENAI_API_KEY`、`ENGINE_MODE`、`SCORING_MODE`、`CONTENT_MODE`。

## v2 Backlog（非 v1，需批准才立项）

| 项 | 说明 |
|----|------|
| 高保真 UI / Figma 设计稿 | 当前为功能型看板，无设计系统 |
| 告警外推 | 邮件 / IM / Webhook |
| 多 LLM / 多引擎 | 当前仅 OpenAI 代理 |
| ai / worker 独立部署 | 现合并在 backend |
| 移动端响应式 | 桌面优先 |
| RBAC / 多租户 | 与单用户前提冲突，不做 |

## 依赖关系

```
GEO-014 ─┬─> GEO-015 ─> GEO-016 ─┬─> GEO-017
         │                        └─> GEO-018
         └─> GEO-019 ─> GEO-020 ─> GEO-021 ─> GEO-022
                                        └─> GEO-023
GEO-024 / GEO-025 可在任意时点穿插，不阻塞主线
SPEC-GEO-PROD-001 ─> SPEC-GEO-026（v1 收官，无后续模块 SPEC 直至 v2 批准）
```

## 约束（单用户前提）

- 鉴权：本地单用户 / 单 API Key，不做 RBAC 与审核流
- 发布：仅官方 API（自有 CMS），无接口渠道导出发布稿 + 人工
- 引擎：默认 stub，配 Key 才真实调用，保证离线可测
- 告警：先站内/日志，邮件/IM 推送可选
