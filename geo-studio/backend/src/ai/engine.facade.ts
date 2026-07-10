import { Injectable } from "@nestjs/common";
import { requestChatJson } from "./llm-client";
import { resolveEngineMode } from "./llm-config";
import { resolveLlmRoute } from "./llm-router";
import { engineSystemPrompt } from "./prompt-registry";

export interface EngineLiveSource {
  url: string;
  title?: string;
}

export interface EngineLiveAnswer {
  engineId: string;
  answer: string;
  sources: EngineLiveSource[];
}

interface EngineLlmResponse {
  answer?: unknown;
  sources?: Array<{ url?: unknown; title?: unknown }>;
}

@Injectable()
export class EngineAiFacade {
  isLiveMode(): boolean {
    return resolveEngineMode() !== "stub";
  }

  async runQuestion(question: string): Promise<EngineLiveAnswer | null> {
    if (!this.isLiveMode()) {
      return null;
    }

    const parsed = await requestChatJson<EngineLlmResponse>([
      { role: "system", content: engineSystemPrompt() },
      { role: "user", content: question },
    ]);
    if (!parsed) {
      return null;
    }

    const answer = typeof parsed.answer === "string" && parsed.answer.trim() ? parsed.answer.trim() : null;
    const sources =
      Array.isArray(parsed.sources) && parsed.sources.length > 0
        ? parsed.sources
            .filter((s) => typeof s.url === "string" && s.url.trim())
            .map((s) => ({
              url: String(s.url),
              ...(typeof s.title === "string" && s.title.trim() ? { title: String(s.title) } : {}),
            }))
        : [];

    if (!answer) {
      return null;
    }
    const route = resolveLlmRoute();
    return {
      engineId: `${route?.provider ?? "openai"}:${route?.model ?? "unknown"}`,
      answer,
      sources,
    };
  }
}
