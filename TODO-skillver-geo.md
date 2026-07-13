# Skillver GEO TODO

> 创建：2026-07-08 · 配套总纲：`README.md`
> 状态标记：[ ] 待办 / [~] 进行中 / [x] 完成
> 分类：【开发】= 项目开发（写代码/部署），【人工】= 运营/内容/事务性工作

---

## P0 · 冲刺期（第 1–4 周，2026-07）

### A. GEO Studio 投产（监测底座）

- [ ] 【人工】开通 7 家引擎 API Key：火山方舟（豆包）、Moonshot（Kimi）、DeepSeek、腾讯 TokenHub（元宝/混元）、Google AI（Gemini）、OpenAI、Anthropic；充值并记录费用口径
- [ ] 【开发】部署 GEO Studio（`geo-studio/`：db:up → prisma migrate → backend + worker + web），配置 `.env`（各引擎 Key + `DIAGNOSTIC_ENGINE_IDS` 控成本）
- [ ] 【人工】录入 Skillver 品牌实体：品牌定义、断言库（7D 战力/T-Code/四步漏斗/费用口径等核心事实，从 `03-content-assets/` 提取）、竞品库（BOSS 直聘、牛客、实习僧等）
- [ ] 【人工+开发】生成四类问题集（品类/品牌/属性/对比），对齐 32 问基线表；跑**首次 9 引擎全量基线**并存档
- [ ] 【开发】（P1 可选）文心引擎连接器（百度千帆，复用 `OpenAiCompatEngineConnector` 模式）
- [ ] 【开发】（P1 可选）geo-studio 引擎连接器改动提交 git（当前在工作区未提交）

### B. 官网阵地（tcodeai.com · cpweb）

- [x] URL 对齐：`/research/` `/company/` `/protocol/` `/product/` `/solutions/`（2026-07-08）
- [~] 封闭内测口径纠偏：GEO 文档已统一；tcodeai.com 生产首页与 `llms.txt` 仍待主站团队部署修正（见 `MAIN-REPO-GEO-HANDOFF-2026-07-09.md`）
- [x] Solutions 页：AI 企业 B 端价值（`cpweb/solutions/index.html`）
- [x] T-Code 法务双签：PO 同意（`cpweb/docs/legal/T-CODE-legal-signoff-2026-07.md`）
- [ ] Media Kit（**先不做**，待定）
- [ ] GEO P1 运维：站长平台 sitemap 提交、基线填表、爬虫周报

### C. Skillver 主站 GEO

- [x] 【开发】`GEO-MAIN-2026-07-P0` 代码开发、测试并推送 `origin/main`（commit `ca69dc9a`，本地相关套件 55/55 通过）
- [x] 【开发】sitemap URL 防御性回退、运行级正/边界/反例测试及三域重试冒烟脚本
- [x] 【开发】C01/C05/C13/C15/C16 FAQ 稳定锚点、段落级内链与事实漂移守护
- [ ] 【开发+运维】ECS 部署 `ca69dc9a`，记录生产版本并执行三域连续三次冒烟
- [ ] 【运维】取得 sitemap 间歇 500 原始日志并完成根因闭环；防御性代码通过不等于根因已确认
- [ ] 【人工+运维】Rich Results 截图、百度/Bing/Google sitemap 提交、WAF/ECS 签字与首份 AI 爬虫周报

### F. 独立工作区与上游快照

- [x] 【开发】建立 `upstream/skillver_v1` 只读快照机制（manifest + schema + 导出/漂移脚本）
- [x] 【开发】从 `skillver_v1@ca69dc9a` 导出 llms、public-facts、seo-contract、implementation-status、protected-sources
- [x] 【开发】`03-content-assets/manifest.json` 标注 current/derived 与 sha256
- [ ] 【人工+开发】主仓发版后重跑 `export_upstream_snapshot.py` 并登记新 commit
- [ ] 【开发】定位 tcodeai 第三仓后补 `upstream/tcodeai/manifest.json` 快照

### G. 内容宣发（16 格 4 周排期，台账见 `01-strategy/GEO-语义及切片、发布平台、排期.md`）

- [ ] 【人工】平台账号开通/认证：公众号（首发主阵地）、头条号、百家号、知乎机构号、小红书、脉脉、B 站
- [ ] 【人工】W1 信任先行：C13「会不会挂我」、C16「开放注册与赛事邀请码」等 G 系列稿（发布前确认开放注册口径，并复核费用/次数/导师状态等待核实声明）
- [ ] 【人工】W2 选型对比：C05–C07 AI 求职工具横评、NAV 对比
- [ ] 【人工】W3 场景深化：C09 七维差距诊断、操作指南类
- [ ] 【人工】W4 认知补全+权威：C01 定义类、白皮书金句切片
- [ ] 【人工】每稿执行「一母稿多平台变体」+ 发布前 6 项检查（3 秒价值、禁术语、当天可用等，见 `04-channels/`）
- [ ] 【人工】知乎/小红书 UGC 飞轮启动：高赞问题挂靠清单（非自问自答）、四支柱内容配比（面经 35%/痛点 30%/热点 20%/种草 15%）

### E. 度量例行（每周）

- [ ] 【人工+工具】每周 32 问 × 9 引擎抽测：API 引擎走 GEO Studio 定时复测；元宝/豆包 App 端真实行为人工抽测补充
- [ ] 【人工】错误信息告警处理：发现引擎答错 → 回溯信源 → 补/改内容
- [ ] 【人工】发布台账更新（16 格覆盖度，当前 1/16）

---

## P1 · 地基期（第 1–3 月）

- [ ] 【人工】49 张岗位卡切片生产（每卡 6 子切片：定义/KAE 能力点/七维权重/常见差距/考察形式/发展路径），覆盖 AI/机器人/互联网/智能驾驶四行业
- [ ] 【人工】L1 术语词条全量（KAE、七维战力、T-Code 等锚点概念嵌入所有内容）
- [ ] 【开发】tcodeai.com 内容站与 GEO Studio 分发打通（cms-rest 连接器对接，或维持 export 人工发布）
- [ ] 【人工】社交货币机制上线配合：简历核验海报（A/B/C 人格标签）传播监测，晒图内容回收为 L6 口碑素材
- [ ] 【人工】月度引擎基线复盘：提及率/正面率/准确率趋势，调整语义矩阵缺口

## P2 · 扩容期（第 4–8 月）

- [ ] 【人工】岗位卡扩至 70–80 张
- [ ] 【人工】首份白皮书借势传播（36氪/界面/网易投稿）
- [ ] 【人工】L6 真实口碑规模化：脱敏授权的面试报告/Offer 故事（「被看见的故事」四段式）

## P3 · 权威期（第 9–12 月）

- [ ] 【人工】岗位卡 100+；公平性年度报告
- [ ] 【人工】L7 权威背书：国家级媒体、人社部/高校渠道
- [ ] 【人工】百度百科等被动收录核查与纠错

---

## 依赖与风险备忘

1. **口径检查**：`01-strategy/` 与 `04-channels/` 须同步「全面开放注册；邀请码仅用于赛事参与」；每篇发布前清除「需邀请码才能注册 / 封闭内测准入」旧叙事，并人工核实费用、具体体验或名额数量、导师服务状态。
2. **元宝观测局限**：`yuanbao` 连接器走混元底座 API，与元宝 App 真实检索增强行为有偏差，App 端人工抽测不可省。
3. **跑批成本**：9 引擎全量跑批成本 ≈ 单引擎 9 倍，例行复测建议 `DIAGNOSTIC_ENGINE_IDS` 只选主战引擎（豆包/Kimi/DeepSeek/元宝/ChatGPT），全量基线每月一次。
4. **单一事实源**：所有内容口径以 `03-content-assets/` + skillver_v1 `docs/active/v1/` 为准；产品功能变更时先更新事实源再更新切片。
