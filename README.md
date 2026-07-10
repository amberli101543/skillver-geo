# Skillver 整体 GEO 方案（总纲）

> 版本：v1.1 · 2026-07-09
> 唯一口径：Skillver 当前处于**封闭内测**，采用**邀请码准入**；GEO 按内测阶段的真实能力与进展执行，不暗示任何无邀请准入方式。
> 本文件夹与 skillver_v1 代码仓库相互独立：这里是 GEO 战略、内容资产与执行工具（GEO Studio）的唯一集合地；skillver_v1 仓库只保留主站技术实现（schema/llms.txt/爬虫脚本）与运维台账。

---

## 一、文件夹结构

| 目录 | 内容 | 角色 |
|------|------|------|
| `01-strategy/` | `Skillver_GEO执行方案-语义矩阵与切片.20260701.md`（**战略终稿**：L1–L10 十层矩阵 + 12 月计划）、`GEO-语义及切片、发布平台、排期.md`（**执行主文档**：16 格矩阵 + 4 周排期 + 发布台账） | 决定发什么、何时发 |
| `02-website-geo/` | `Skillver官网GEO执行文档（最终版）.txt` | 官网 9 页 IA、上线顺序、schema 待办 |
| `03-content-assets/` | 两本人才白皮书、用户手册/指南、产品说明、《AI 方舟》品牌文 | 内容事实源（SSOT），所有切片从这里派生 |
| `04-channels/` | 渠道增长运营方案、种草文案范例、社交货币机制 | 平台战术与转化工具 |
| `geo-studio/` | GEO Studio 完整代码（NestJS + React） | 诊断跑批、语义矩阵、分发、复测监控的执行底座 |
| `upstream/` | 主站/tcodeai 只读事实快照与 manifest | 可携带离线证据；不可反向编辑为主站 SSOT |
| `content/` | 五篇母稿 + `publish-ready/` 渠道变体 | 宣发执行资产 |
| `archive/` | 被新版吸收的旧版文档（C 端语义矩阵概念稿、官网策略/内容计划/页面结构草稿） | 仅溯源，不作依据 |

## 二、五层体系

1. **口径层**：中文主口径「AI 求职助手」；统一 T-Code 写法；对外只讲 What/Why/When，不公开 Prompt/评分算法/DB Schema。事实源 = `03-content-assets/` + skillver_v1 `docs/active/v1/`。
2. **阵地层**：skillver.cn 主站（补齐 9 页 IA：/faq 扩 30–50 题 → /beta → /company → 白皮书 HTML → /protocol → /product）＋ tcodeai.com 内容站，三域 canonical 绑定。
3. **内容层**：L1–L10 矩阵定年度资产（术语→岗位卡 49→100+→技能点→白皮书→FAQ→口碑→权威），16 格矩阵定近端排期（主攻选型 C05–C07 与信任 C13/C16 格群）；一格一母稿多平台变体。
4. **渠道层**：公众号（→元宝）、头条/抖音（→豆包）、知乎+CSDN（重仓→Kimi/DeepSeek）、百家号（→文心）、36氪/网易（→通义）、小红书+知乎 UGC 飞轮；种草文案与社交货币海报做转化。
5. **度量层**：GEO Studio 建 Skillver Brand + 断言库 + 竞品库，多引擎跑批测提及率/正面率/准确率，每周复测；引擎覆盖见下节。

## 三、引擎覆盖（GEO Studio）

2026-07-08 已完成 7 个新引擎连接器（`geo-studio/docs/CONNECTORS.md`）：

| 引擎 | engineId | 说明 |
|------|----------|------|
| 豆包 | `doubao` | 火山方舟 Ark OpenAI 兼容 API |
| Kimi | `kimi` | Moonshot 开放平台 |
| DeepSeek | `deepseek` | DeepSeek 开放平台 |
| 元宝 | `yuanbao` | 无公开 API，以底座混元（腾讯 TokenHub）代理观测 |
| Gemini | `gemini` | Google OpenAI 兼容端点 |
| ChatGPT | `chatgpt` | OpenAI 直连 |
| Claude | `claude` | Anthropic OpenAI 兼容别名端点 |

加上既有 `openai-proxy` 与 `perplexity` 共 9 个。所有引擎无 Key 自动降级 stub；跑批用 `DIAGNOSTIC_ENGINE_IDS` 控制目标引擎与成本。配置见 `geo-studio/backend/.env.example`。

**尚无法 API 观测的引擎**：文心（百度千帆可后续接入）、豆包/元宝 App 端真实检索增强行为（API 仅近似底座模型）——对这些保留每周人工抽测（32 问基线表）。

## 四、封闭内测阶段时间线（自 2026-07 起）

| 阶段 | 时间 | 目标 |
|------|------|------|
| **冲刺期** | 第 1–4 周 | ① 官网 9 页 IA 补齐 + 白皮书 HTML 化 + FAQ 扩容；② 16 格 4 周排期全量执行（W1 信任 → W2 选型 → W3 场景 → W4 认知+权威，G/T/M 台账见 01-strategy）；③ GEO Studio 建 Skillver 品牌、录断言/竞品，配置国内外引擎 Key，跑首次全引擎基线 |
| **地基期** | 第 1–3 月 | 49 张岗位卡 + 术语词条 + FAQ 全量发布；知乎/小红书 UGC 飞轮起量；每周全引擎复测，错误信息告警回溯信源 |
| **扩容期** | 第 4–8 月 | 岗位卡扩至 70–80；首份白皮书借势传播；L6 真实口碑（面试报告/Offer 故事）规模化；社交货币海报裂变 |
| **权威期** | 第 9–12 月 | 100+ 岗位卡；公平性年度报告；国家级媒体/高校背书（L7）；从「被提及」到「被引用为标准」 |

## 五、内容声明口径

声明清单的机器可读事实源为 `docs/content-claims.json`，结构由 `docs/content-claims.schema.json` 锁定：

- **允许**：封闭内测、内测中、邀请码准入、内测申请等与当前阶段一致的表述。
- **禁止**：把当前阶段写成已向所有人发布、允许直接自助准入或免除邀请凭证。
- **待核实**：费用、具体体验或准入数量、导师服务状态；业务事实源确认前不得当作既成事实新增或发布。

运行口径检查：

```powershell
python scripts/check_content_claims.py
python -m unittest tests/test_content_claims.py
```

检查器扫描 `README.md`、`TODO-skillver-geo.md`、`01-strategy/`、`04-channels/` 与 `content/`；禁止声明返回非零退出码，待核实声明以 warning 提醒人工复核。

## 六、与 skillver_v1 仓库的边界

- 主站 GEO 技术实现（JSON-LD、llms.txt、sitemap、爬虫脚本、GEO 页面）留在 skillver_v1，按其 `TODO-geo-2026-07.md` / `GEO-ops-runbook` 推进；本文件夹不复制其业务代码。
- 本文件夹的内容/排期文档是宣发侧唯一事实源；skillver_v1 文档引用本方案时只链接、不复述。
- 可携带事实快照保存在 `upstream/skillver_v1/snapshots/<commit>/`，由 `scripts/export_upstream_snapshot.py` 从主仓 pinned commit 导出；受保护 SPEC 仅登记路径与 hash，不复制正文。
- 数据流：主仓产品事实 → 受控快照 → GEO 内容/handoff → 主站实现；禁止双向复制编辑。
- 校园情报站为独立产品独立域名，不纳入本 GEO 体系口径。

### 独立工作区维护命令

```powershell
python scripts/export_upstream_snapshot.py --commit ca69dc9a
python scripts/check_upstream_drift.py
python scripts/check_content_claims.py
python scripts/validate_geo_assets.py
python -m unittest discover -s tests -v
```
