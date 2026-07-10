import { type Brand } from "../brand/brand";
import { type EngineTestResult } from "../engine/engine-test-service";

export type Sentiment = "positive" | "neutral" | "negative";

export interface TestScore {
  mentioned: boolean;
  mentionPosition: number | null;
  sentiment: Sentiment;
  accuracy: number;
  sourcesCount: number;
  /** RAG chunks retrieved for scoring context (GEO-041, not persisted). */
  ragSnippets?: string[];
}

const POSITIVE_KEYWORDS = ["推荐", "优秀", "领先", "值得", "首选", "good", "best"];
const NEGATIVE_KEYWORDS = ["不推荐", "差", "avoid", "poor", "worst"];

export function scoreEngineTest(brand: Brand, result: EngineTestResult): TestScore {
  const answer = result.answer;
  const lower = answer.toLowerCase();
  const nameLower = brand.name.toLowerCase();
  const idx = lower.indexOf(nameLower);
  const mentioned = idx >= 0;

  return {
    mentioned,
    mentionPosition: mentioned ? idx : null,
    sentiment: detectSentiment(answer),
    accuracy: estimateAccuracy(brand, answer, mentioned),
    sourcesCount: result.sources.length,
  };
}

function detectSentiment(answer: string): Sentiment {
  const lower = answer.toLowerCase();
  if (NEGATIVE_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) {
    return "negative";
  }
  if (POSITIVE_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) {
    return "positive";
  }
  return "neutral";
}

function estimateAccuracy(brand: Brand, answer: string, mentioned: boolean): number {
  if (!mentioned) {
    return 0.2;
  }
  const defSnippet = brand.definition.trim().slice(0, Math.min(8, brand.definition.length));
  if (defSnippet.length >= 2 && answer.includes(defSnippet)) {
    return 0.8;
  }
  return 0.5;
}
