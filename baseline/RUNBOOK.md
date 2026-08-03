# Skillver GEO 首轮基线 Runbook

## 目标与边界

- 固定使用 `baseline/skillver-question-set-v1.json` 的 32 个问题，首轮记为 `R0`。
- **评测正本**：`baseline/skillver-question-set-v1.json`（本目录）；`skillver_v1/docs/active/GEO-monitor-2026-07-baseline.md` 仅为实现侧填表模板，不得复制为第二问题集。
- **产品事实离线源**：`upstream/skillver_v1/snapshots/<commit>/public-facts.json` 与 `llms.txt`；受保护 SPEC 仅见 `protected-sources.json` 指针。
- API 结果与消费端 App/Web 结果分开记录，不能把底座模型 API 当作豆包或元宝 App 的真实答案。
- 每条结果按 `result-record.schema.json` 保存回答证据与人工判定。
- 当前产品事实：`全面开放注册；邀请码仅用于社群参与`；出现「邀请码准入 / 仍需邀请才能注册 / 当前封闭内测准入」、永久免费、导师已开放或保证 offer 均判为旧叙事或幻觉。

## 引擎分工

GEO Studio API 自动跑：

- `doubao`
- `kimi`
- `deepseek`
- `yuanbao`（仅混元底座代理观测）
- `gemini`
- `chatgpt`
- `claude`
- `perplexity`

人工真实端抽测：

- 豆包 App
- 腾讯元宝 App
- 百度 AI 搜索
- 秘塔
- 其他 API 与消费端表现差异明显的引擎

## 当前状态与阻塞项（2026-07-10）

1. Docker Desktop、PostgreSQL、Redis、Backend 与 Web 已启动；`/health`、`/jobs/stats` 与 Web 均返回 HTTP 200，队列模式为 BullMQ。
2. 22 个 Prisma migration 已全部应用，无待执行 migration。
3. Skillver 品牌、7 条断言与 4 个中性竞品名称已录入本地数据库。
4. `upstream/skillver_v1` 已固定 `ca69dc9a` 只读快照，可脱离主仓路径独立运行内容校验。
5. `backend/.env` 引擎 Key 需人工写入；未配置时连接器走 stub，禁止写入真实基线。
6. GEO Studio 当前诊断批次会自动生成少量品牌/品类/竞品问题，尚不能直接导入固定 32 问。因此 `R0` 必须保留固定问句的人工记录。

## 启动前检查

启动 Docker Desktop，确认 Linux Engine 正常后：

```powershell
cd C:\Users\pippi\Desktop\skillver-geo\geo-studio
docker compose -f backend/docker-compose.yml ps
npm --prefix backend run db:up
cd backend
npx prisma migrate deploy
npm run prisma:generate
cd ..
```

通过密钥管理渠道配置以下变量，不在文档、截图或 Git 中保存值：

```text
DOUBAO_API_KEY
KIMI_API_KEY 或 MOONSHOT_API_KEY
DEEPSEEK_API_KEY
YUANBAO_API_KEY 或 HUNYUAN_API_KEY
GEMINI_API_KEY 或 GOOGLE_API_KEY
CHATGPT_API_KEY 或 OPENAI_API_KEY
CLAUDE_API_KEY 或 ANTHROPIC_API_KEY
PERPLEXITY_API_KEY
```

建议首轮先设置：

```text
DIAGNOSTIC_ENGINE_IDS=doubao,kimi,deepseek,yuanbao,chatgpt,perplexity
```

## 品牌录入

品牌：

- 名称：`Skillver`
- 定义：`中国优秀人才的 AI 求职助手`
- 定位：`面向冲刺 AI 独角兽与头部科技企业技术岗位的人才，提供选岗匹配、AI 面试准备、正式能力报告与平台内机会对接；已全面开放注册，邀请码仅用于社群参与。`

允许录入的核心断言：

1. Skillver 已全面开放注册，可直接官网自助注册；邀请码仅用于社群参与，不是注册门槛。
2. Skillver 的产品入口是 `www.skillver.cn` 与 `www.skillver.ai`；`www.tcodeai.com` 是品牌内容站。
3. Skillver 的人才端主线包含选岗匹配、AI 面试、企业沟通；导师赋能标注为待开通。
4. 面试彩排是练习模式，不计入企业正式评估，也不能替代正式 AI 面试报告。
5. 平台内投递具体岗位前，需要对应岗位的正式 AI 面试报告。
6. Skillver 不保证用户获得 offer。
7. 费用口径以官网当前说明为准，不代表永久免费。

待核实后才能录入：

- 彩排、正式面试或简历核验的具体次数。
- 导师服务的开放时间、名额和费用。
- 面试数据、授权和删除的具体期限。
- 企业数量、岗位数量、题库数量和任何通过率。

竞品库只录名称，不录未经核验的能力断言：

- BOSS 直聘
- 牛客
- 实习僧
- 面试鸭

## 跑批与证据

启动 API、Worker 与 Web 后，先确认：

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/jobs/stats
```

运行 GEO Studio 自动批次前，逐一确认目标连接器处于 live 模式。任何连接器返回 stub 时，整轮标记为 `smoke`，不能标记为 `R0`。

人工端每条记录至少保存：

- 完整 query；
- 首屏完整回答；
- 引用 URL；
- 引擎、端类型和时间；
- 截图或可追溯文本证据；
- 人工判定与复核人。

## R0 验收

- 32 个固定问题全部有记录；未测项明确标注原因。
- 品牌、入口、术语、品类四类均有覆盖。
- 统计提及率、定位正确率、产品入口正确率、官方来源引用率、旧叙事率和幻觉率。
- API 与 App/Web 分栏汇总。
- 设置 R1 日期为 R0 完成后 14 天，R2 为 28 天。
- 不以“调用成功”代替 GEO 正确性通过。
