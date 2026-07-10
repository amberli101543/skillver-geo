import { Injectable } from "@nestjs/common";
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "../engine-connector";

export const PERPLEXITY_ENGINE_ID = "perplexity";

interface PerplexityChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
  search_results?: Array<{ title?: string; url?: string }>;
}

@Injectable()
export class PerplexityEngineConnector extends EngineConnector {
  async run(question: string): Promise<EngineAnswer> {
    const apiKey = resolvePerplexityApiKey();
    if (!apiKey || isPerplexityStubMode()) {
      return { ...stubEngineAnswer(question), engineId: `${PERPLEXITY_ENGINE_ID}-stub` };
    }

    const live = await this.callPerplexity(apiKey, question);
    if (live) {
      return live;
    }
    return { ...stubEngineAnswer(question), engineId: `${PERPLEXITY_ENGINE_ID}-stub` };
  }

  private async callPerplexity(apiKey: string, question: string): Promise<EngineAnswer | null> {
    const model = process.env.PERPLEXITY_MODEL?.trim() || "sonar";
    const timeoutMs = Number(process.env.PERPLEXITY_TIMEOUT_MS ?? 20000);
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;

    try {
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
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
                "You are a search-augmented AI engine. Answer in Chinese when the question is in Chinese. Be factual and concise.",
            },
            { role: "user", content: question },
          ],
        }),
      });
      if (!res.ok) {
        return null;
      }

      const payload = (await res.json()) as PerplexityChatResponse;
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return null;
      }

      const sources = extractSources(payload);
      return {
        engineId: `${PERPLEXITY_ENGINE_ID}:${model}`,
        answer,
        sources,
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

function extractSources(payload: PerplexityChatResponse): EngineAnswer["sources"] {
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

function resolvePerplexityApiKey(): string | undefined {
  return process.env.PERPLEXITY_API_KEY?.trim() || undefined;
}

function isPerplexityStubMode(): boolean {
  const mode = process.env.PERPLEXITY_MODE?.trim() ?? process.env.ENGINE_MODE?.trim();
  return mode === "stub";
}
