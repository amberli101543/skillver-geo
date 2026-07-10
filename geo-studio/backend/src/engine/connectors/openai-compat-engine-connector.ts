import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "../engine-connector";

export interface ChatEngineVendor {
  /** 注册到 EngineRegistry 的 engineId */
  id: string;
  name: string;
  description: string;
  /** OpenAI 兼容 API 根地址（不含 /chat/completions） */
  baseUrl: string;
  defaultModel: string;
  /** 环境变量前缀，如 DOUBAO → DOUBAO_API_KEY / DOUBAO_MODEL / DOUBAO_BASE_URL / DOUBAO_MODE / DOUBAO_TIMEOUT_MS */
  envPrefix: string;
  /** 额外可接受的 API Key 环境变量名（厂商同义名，如 MOONSHOT_API_KEY） */
  apiKeyEnvFallbacks?: string[];
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
  search_results?: Array<{ title?: string; url?: string }>;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * 通用 OpenAI 兼容引擎连接器。
 * 豆包（火山方舟）、元宝（腾讯 TokenHub）、Kimi、DeepSeek、Gemini、ChatGPT、Claude
 * 均暴露 OpenAI 兼容的 /chat/completions 端点，仅 baseUrl / model / key 不同。
 * 无 Key 或 <PREFIX>_MODE=stub（或全局 ENGINE_MODE=stub）时返回确定性 stub。
 */
export class OpenAiCompatEngineConnector extends EngineConnector {
  constructor(readonly vendor: ChatEngineVendor) {
    super();
  }

  async run(question: string): Promise<EngineAnswer> {
    const apiKey = this.resolveApiKey();
    if (!apiKey || this.isStubMode()) {
      return { ...stubEngineAnswer(question), engineId: `${this.vendor.id}-stub` };
    }

    const live = await this.callChatCompletions(apiKey, question);
    if (live) {
      return live;
    }
    return { ...stubEngineAnswer(question), engineId: `${this.vendor.id}-stub` };
  }

  private env(suffix: string): string | undefined {
    return process.env[`${this.vendor.envPrefix}_${suffix}`]?.trim() || undefined;
  }

  private resolveApiKey(): string | undefined {
    const primary = this.env("API_KEY");
    if (primary) {
      return primary;
    }
    for (const name of this.vendor.apiKeyEnvFallbacks ?? []) {
      const value = process.env[name]?.trim();
      if (value) {
        return value;
      }
    }
    return undefined;
  }

  private isStubMode(): boolean {
    const mode = this.env("MODE") ?? process.env.ENGINE_MODE?.trim();
    return mode === "stub";
  }

  private resolveModel(): string {
    return this.env("MODEL") ?? this.vendor.defaultModel;
  }

  private resolveEndpoint(): string {
    const base = this.env("BASE_URL") ?? this.vendor.baseUrl;
    return `${base.replace(/\/+$/, "")}/chat/completions`;
  }

  private resolveTimeoutMs(): number {
    const raw = Number(this.env("TIMEOUT_MS") ?? process.env.ENGINE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
  }

  private async callChatCompletions(apiKey: string, question: string): Promise<EngineAnswer | null> {
    const model = this.resolveModel();
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;

    try {
      timer = setTimeout(() => controller.abort(), this.resolveTimeoutMs());
      const res = await fetch(this.resolveEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant answering end-user questions. Answer in Chinese when the question is in Chinese. Be factual and concise.",
            },
            { role: "user", content: question },
          ],
        }),
      });
      if (!res.ok) {
        return null;
      }

      const payload = (await res.json()) as ChatCompletionResponse;
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return null;
      }

      return {
        engineId: `${this.vendor.id}:${model}`,
        answer,
        sources: extractSources(payload),
      };
    } catch {
      return null;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

function extractSources(payload: ChatCompletionResponse): EngineAnswer["sources"] {
  const fromSearch =
    payload.search_results
      ?.filter((item) => typeof item.url === "string" && item.url.trim())
      .map((item) => ({
        url: String(item.url),
        ...(typeof item.title === "string" && item.title.trim() ? { title: item.title.trim() } : {}),
      })) ?? [];

  if (fromSearch.length > 0) {
    return fromSearch;
  }

  return (payload.citations ?? [])
    .filter((url) => typeof url === "string" && url.trim())
    .map((url) => ({ url: url.trim() }));
}
