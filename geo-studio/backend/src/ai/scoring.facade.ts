import { Injectable, Optional } from "@nestjs/common";
import { requestChatJson } from "./llm-client";
import { resolveScoringMode } from "./llm-config";
import { scoringSystemPrompt } from "./prompt-registry";
import { RagService } from "./rag/rag.service";

export type ScoringSentiment = "positive" | "neutral" | "negative";

export interface ScoringLiveInput {
  brandId?: string;
  brandName: string;
  brandDefinition: string;
  brandPositioning?: string;
  question: string;
  answer: string;
  sourcesCount: number;
}

export interface ScoringLiveResult {
  mentioned: boolean;
  mentionPosition: number | null;
  sentiment: ScoringSentiment;
  accuracy: number;
  sourcesCount: number;
}

export interface ScoringAiOutcome {
  score: ScoringLiveResult | null;
  ragSnippets: string[];
}

interface ScoringLlmResponse {
  mentioned?: unknown;
  mentionPosition?: unknown;
  sentiment?: unknown;
  accuracy?: unknown;
}

@Injectable()
export class ScoringAiFacade {
  constructor(@Optional() private readonly rag?: RagService) {}

  isLiveMode(): boolean {
    return resolveScoringMode() !== "rule";
  }

  async score(input: ScoringLiveInput): Promise<ScoringAiOutcome> {
    const ragSnippets = await this.retrieveSnippets(input);
    if (!this.isLiveMode()) {
      return { score: null, ragSnippets };
    }

    const ragBlock = this.rag?.formatContext(ragSnippets) ?? "";

    const parsed = await requestChatJson<ScoringLlmResponse>([
      { role: "system", content: scoringSystemPrompt() },
      {
        role: "user",
        content:
          [
            `品牌：${input.brandName}`,
            `定义：${input.brandDefinition}`,
            input.brandPositioning ? `定位：${input.brandPositioning}` : "",
            `问题：${input.question}`,
            `回答：${input.answer}`,
            `来源数：${input.sourcesCount}`,
          ]
            .filter(Boolean)
            .join("\n") + ragBlock,
      },
    ]);

    return { score: normalizeLlmScore(parsed, input.sourcesCount), ragSnippets };
  }

  async retrieveSnippets(input: ScoringLiveInput): Promise<string[]> {
    if (!this.rag || !input.brandId) {
      return [];
    }
    const query = `${input.question} ${input.brandDefinition}`;
    return this.rag.retrieve(input.brandId, query);
  }
}

function normalizeLlmScore(parsed: ScoringLlmResponse | null, sourcesCount: number): ScoringLiveResult | null {
  if (!parsed) return null;
  if (typeof parsed.mentioned !== "boolean") return null;
  if (!isSentiment(parsed.sentiment)) return null;
  if (typeof parsed.accuracy !== "number" || parsed.accuracy < 0 || parsed.accuracy > 1) return null;

  const mentionPosition =
    parsed.mentionPosition === null
      ? null
      : typeof parsed.mentionPosition === "number" && Number.isFinite(parsed.mentionPosition)
        ? Math.max(0, Math.floor(parsed.mentionPosition))
        : null;

  return {
    mentioned: parsed.mentioned,
    mentionPosition: parsed.mentioned ? mentionPosition : null,
    sentiment: parsed.sentiment,
    accuracy: parsed.accuracy,
    sourcesCount,
  };
}

function isSentiment(value: unknown): value is ScoringSentiment {
  return value === "positive" || value === "neutral" || value === "negative";
}
