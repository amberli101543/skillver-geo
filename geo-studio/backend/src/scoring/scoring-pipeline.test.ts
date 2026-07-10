import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { type Brand } from "../brand/brand";
import { type EngineTestResult } from "../engine/engine-test-service";
import { ProxyScoringPipeline, RuleScoringPipeline } from "./scoring-pipeline";

const brand: Brand = {
  id: "b1",
  name: "Acme",
  definition: "项目管理 SaaS",
};

const engineResult: EngineTestResult = {
  question: "Acme 是什么？",
  runAt: "2026-06-11T12:00:00.000Z",
  engineId: "proxy-engine-stub",
  answer: "Acme 是领先的项目管理 SaaS。",
  sources: [{ url: "https://example.com/1" }],
};

describe("ProxyScoringPipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.SCORING_MODE;
  });

  it("falls back to rule scoring without API key", async () => {
    const pipeline = new ProxyScoringPipeline(new RuleScoringPipeline(), new ScoringAiFacade());
    const score = await pipeline.score(brand, engineResult);
    expect(score.mentioned).toBe(true);
    expect(score.sentiment).toBe("positive");
  });

  it("uses LLM scoring when configured", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.SCORING_MODE = "llm";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    mentioned: true,
                    mentionPosition: 0,
                    sentiment: "positive",
                    accuracy: 0.92,
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const pipeline = new ProxyScoringPipeline(new RuleScoringPipeline(), new ScoringAiFacade());
    const score = await pipeline.score(brand, engineResult);
    expect(score.accuracy).toBe(0.92);
    expect(score.sourcesCount).toBe(1);
  });
});
