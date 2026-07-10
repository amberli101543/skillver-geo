import type { ChatEngineVendor } from "./openai-compat-engine-connector";

/**
 * OpenAI 兼容聊天引擎目录（SPEC-GEO-036 国内外引擎扩展）。
 * 每个厂商通过 <ENV_PREFIX>_API_KEY / _MODEL / _BASE_URL / _MODE / _TIMEOUT_MS 配置。
 */
export const CHAT_ENGINE_VENDORS: ChatEngineVendor[] = [
  {
    id: "doubao",
    name: "豆包（火山方舟）",
    description:
      "字节豆包，经火山方舟 Ark OpenAI 兼容 API 调用；model 填 Ark 模型 ID（如 doubao-seed-1-6-251015）或推理接入点 ep-*；无 DOUBAO_API_KEY 或 DOUBAO_MODE=stub 时走 stub。",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    defaultModel: "doubao-seed-1-6-251015",
    envPrefix: "DOUBAO",
    apiKeyEnvFallbacks: ["ARK_API_KEY"],
  },
  {
    id: "kimi",
    name: "Kimi（月之暗面）",
    description:
      "Moonshot Kimi 开放平台 OpenAI 兼容 API；无 KIMI_API_KEY（或 MOONSHOT_API_KEY）或 KIMI_MODE=stub 时走 stub。",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "kimi-k2.6",
    envPrefix: "KIMI",
    apiKeyEnvFallbacks: ["MOONSHOT_API_KEY"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description:
      "DeepSeek 开放平台 OpenAI 兼容 API；无 DEEPSEEK_API_KEY 或 DEEPSEEK_MODE=stub 时走 stub。",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    envPrefix: "DEEPSEEK",
  },
  {
    id: "yuanbao",
    name: "元宝（腾讯混元）",
    description:
      "腾讯元宝无公开 API，以其底座混元模型（腾讯 TokenHub OpenAI 兼容端点）代理观测；无 YUANBAO_API_KEY（或 HUNYUAN_API_KEY）或 YUANBAO_MODE=stub 时走 stub。",
    baseUrl: "https://tokenhub.tencentmaas.com/v1",
    defaultModel: "hy3-preview",
    envPrefix: "YUANBAO",
    apiKeyEnvFallbacks: ["HUNYUAN_API_KEY"],
  },
  {
    id: "gemini",
    name: "Gemini（Google）",
    description:
      "Google Gemini API 的 OpenAI 兼容端点；无 GEMINI_API_KEY（或 GOOGLE_API_KEY）或 GEMINI_MODE=stub 时走 stub。",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.5-flash",
    envPrefix: "GEMINI",
    apiKeyEnvFallbacks: ["GOOGLE_API_KEY"],
  },
  {
    id: "chatgpt",
    name: "ChatGPT（OpenAI）",
    description:
      "以 OpenAI Chat Completions 直连模拟 ChatGPT 消费端回答（区别于 openai-proxy 经 LLM Router 的代理引擎）；无 CHATGPT_API_KEY（或 OPENAI_API_KEY）或 CHATGPT_MODE=stub 时走 stub。",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.5",
    envPrefix: "CHATGPT",
    apiKeyEnvFallbacks: ["OPENAI_API_KEY"],
  },
  {
    id: "claude",
    name: "Claude（Anthropic）",
    description:
      "Anthropic Claude 的 OpenAI 兼容 /chat/completions 别名端点；无 CLAUDE_API_KEY（或 ANTHROPIC_API_KEY）或 CLAUDE_MODE=stub 时走 stub。",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
    envPrefix: "CLAUDE",
    apiKeyEnvFallbacks: ["ANTHROPIC_API_KEY"],
  },
];
