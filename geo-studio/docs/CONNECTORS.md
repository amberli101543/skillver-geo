# GEO Studio 连接器能力矩阵

> 新增引擎或发布渠道时：**实现 Connector → 在 Registry 注册 → 更新本文件**。  
> 诊断 / 分发核心循环不得因新连接器而修改。

**最后更新**：2026-07-08（SPEC-GEO-036 国内外引擎扩展：豆包 / Kimi / DeepSeek / 元宝 / Gemini / ChatGPT / Claude）

---

## 引擎连接器（`backend/src/engine/`）

注册表：`EngineRegistry`（`engine-registry.ts`）  
默认 ID：`openai-proxy`（可用 env `ENGINE_ID` 覆盖）

| ID | 名称 | 实现类 | stub | live | 环境变量 | 说明 |
|----|------|--------|------|------|----------|------|
| `openai-proxy` | OpenAI 代理引擎 | `ProxyEngineConnector` | ✅ | ✅ | `OPENAI_API_KEY`, `ENGINE_MODE` | 无 Key 或 `ENGINE_MODE=stub` 时返回确定性 stub 回答；live 时经 `EngineAiFacade` 调 LLM Router |
| `perplexity` | Perplexity 搜索引擎 | `PerplexityEngineConnector` | ✅ | ✅ | `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL`, `PERPLEXITY_MODE` | 真实外部引擎；无 Key 或 `PERPLEXITY_MODE=stub` 时走 stub；live 时调用 Perplexity Sonar API 并返回 citations |
| `doubao` | 豆包（火山方舟） | `OpenAiCompatEngineConnector` | ✅ | ✅ | `DOUBAO_API_KEY`（或 `ARK_API_KEY`）, `DOUBAO_MODEL`, `DOUBAO_BASE_URL`, `DOUBAO_MODE` | Ark OpenAI 兼容端点 `https://ark.cn-beijing.volces.com/api/v3`；model 填 Ark 模型 ID 或推理接入点 `ep-*`，默认 `doubao-seed-1-6-251015` |
| `kimi` | Kimi（月之暗面） | `OpenAiCompatEngineConnector` | ✅ | ✅ | `KIMI_API_KEY`（或 `MOONSHOT_API_KEY`）, `KIMI_MODEL`, `KIMI_BASE_URL`, `KIMI_MODE` | `https://api.moonshot.cn/v1`，默认模型 `kimi-k2.6` |
| `deepseek` | DeepSeek | `OpenAiCompatEngineConnector` | ✅ | ✅ | `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODE` | `https://api.deepseek.com/v1`，默认模型 `deepseek-chat` |
| `yuanbao` | 元宝（腾讯混元） | `OpenAiCompatEngineConnector` | ✅ | ✅ | `YUANBAO_API_KEY`（或 `HUNYUAN_API_KEY`）, `YUANBAO_MODEL`, `YUANBAO_BASE_URL`, `YUANBAO_MODE` | 元宝无公开 API，以底座混元（TokenHub `https://tokenhub.tencentmaas.com/v1`）代理观测，默认模型 `hy3-preview` |
| `gemini` | Gemini（Google） | `OpenAiCompatEngineConnector` | ✅ | ✅ | `GEMINI_API_KEY`（或 `GOOGLE_API_KEY`）, `GEMINI_MODEL`, `GEMINI_BASE_URL`, `GEMINI_MODE` | OpenAI 兼容端点 `https://generativelanguage.googleapis.com/v1beta/openai`，默认模型 `gemini-3.5-flash` |
| `chatgpt` | ChatGPT（OpenAI） | `OpenAiCompatEngineConnector` | ✅ | ✅ | `CHATGPT_API_KEY`（或 `OPENAI_API_KEY`）, `CHATGPT_MODEL`, `CHATGPT_BASE_URL`, `CHATGPT_MODE` | 直连 `https://api.openai.com/v1` 模拟 ChatGPT 消费端回答（区别于经 LLM Router 的 `openai-proxy`），默认模型 `gpt-5.5` |
| `claude` | Claude（Anthropic） | `OpenAiCompatEngineConnector` | ✅ | ✅ | `CLAUDE_API_KEY`（或 `ANTHROPIC_API_KEY`）, `CLAUDE_MODEL`, `CLAUDE_BASE_URL`, `CLAUDE_MODE` | Anthropic OpenAI 兼容 `/chat/completions` 别名端点 `https://api.anthropic.com/v1`，默认模型 `claude-sonnet-4-6` |

> 7 个新引擎共用 `OpenAiCompatEngineConnector`（`connectors/openai-compat-engine-connector.ts`），厂商目录见 `connectors/chat-engine-vendors.ts`。通用超时可用 `<PREFIX>_TIMEOUT_MS` 或全局 `ENGINE_TIMEOUT_MS`（默认 30000ms）覆盖。
> 注意：注册引擎已达 9 个，未设置 `DIAGNOSTIC_ENGINE_IDS` 时跑批默认使用全部引擎，建议显式配置目标引擎列表控制成本。

### 运行时解析

```
EngineTestService → EngineConnector (RegisteredEngineConnector)
  → EngineRegistry.resolve(ENGINE_ID ?? openai-proxy)
  → ProxyEngineConnector → EngineAiFacade → LlmRouter
  → PerplexityEngineConnector → Perplexity API（独立，不经 Facade）
```

### 切换引擎

```bash
# 单题试跑：使用 Perplexity 作为默认引擎
ENGINE_ID=perplexity
PERPLEXITY_API_KEY=pplx-...
PERPLEXITY_MODEL=sonar   # 可选，默认 sonar
```

### 诊断跑批（多引擎）

跑批经 `EngineRegistry.resolveBatchEngineIds()` 解析引擎列表，每题在每个引擎上各产生一条 `EngineTest` 记录。

| 变量 | 说明 | 默认 |
|------|------|------|
| `DIAGNOSTIC_ENGINE_IDS` | 逗号分隔的 engineId 列表，如 `openai-proxy,perplexity` | 未设置时使用 registry 中全部已注册引擎 |
| `DIAGNOSTIC_BATCH_CONCURRENCY` | 批内并行执行的 question×engine 任务上限 | `2` |

Job payload（`diagnostic_batch`）可选字段：`engineIds[]`、`competitors[]`、`attributes[]`。

```
DiagnosticBatchService.runBatch
  → resolveBatchEngineIds(engineIds?)
  → 每题 × 每引擎：EngineTestService.run(text, engineId)
  → EngineRegistry.resolve(engineId) → 对应 EngineConnector
  → 落库：Question 1:N EngineTest（@@unique questionId+engineId）
```

---

## 发布连接器（`backend/src/distribution/`）

注册表：`PublishRegistry`（`publish-registry.ts`）  
按信源 `channelType` 路由

| ID | 名称 | 实现类 | channelType | stub | live | 环境变量 | 说明 |
|----|------|--------|-------------|------|------|----------|------|
| `export-manuscript` | 导出稿件 | `ExportPublishConnector` | `export`, `manual` | — | ✅ | — | 生成 Markdown 稿件，人工发布 |
| `cms-rest` | CMS REST 发布 | `CmsApiPublishConnector` | `api` | ✅ | ✅ | `CMS_API_URL`, `CMS_API_KEY`, `CMS_API_TIMEOUT_MS` | 未配置 CMS 时走 `stubApiPublish` |

### 运行时解析

```
DistributionService.executeTask
  → PublishConnector (RegisteredPublishConnector)
  → PublishRegistry.resolve(source.channelType)
  → ExportPublishConnector | CmsApiPublishConnector
```

---

## LLM 提供商（`backend/src/ai/llm-router.ts`）

| Provider | 用途 | 配置方式 |
|----------|------|----------|
| `openai` | 评分 / 内容 / OpenAI 代理引擎 | 模型目录 + `OPENAI_API_KEY` |
| `anthropic` | 评分 / 内容 / OpenAI 代理引擎 | 模型目录（provider=anthropic）+ Key |

路由策略：当前模型 → 目录中其他模型 fallback；单次请求最多重试 1 次。

---

## 代码入口

| 层 | 文件 |
|----|------|
| LLM 路由 | `backend/src/ai/llm-router.ts` |
| 引擎注册 | `backend/src/engine/engine-registry.ts` |
| Perplexity 连接器 | `backend/src/engine/connectors/perplexity-engine-connector.ts` |
| 发布注册 | `backend/src/distribution/publish-registry.ts` |
| 架构契约 | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 开发计划 | [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md) |

---

## 自检（新连接器 PR）

- [ ] 新类实现 `EngineConnector` 或 `PublishConnector`
- [ ] 在对应 Registry `onModuleInit` 或模块 factory 中 `register()`
- [ ] 更新本文件能力矩阵
- [ ] golden case + `npm --prefix backend test`
