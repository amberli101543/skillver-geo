import { describe, expect, it } from "vitest";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { ScoringService } from "./scoring-service";
import { ProxyScoringPipeline, RuleScoringPipeline } from "./scoring-pipeline";
import { type Brand } from "../brand/brand";
import { type EngineTestResult } from "../engine/engine-test-service";

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

describe("ScoringService", () => {
  it("delegates to scoring pipeline", async () => {
    const svc = new ScoringService(new ProxyScoringPipeline(new RuleScoringPipeline(), new ScoringAiFacade()));
    const score = await svc.score(brand, engineResult);
    expect(score.mentioned).toBe(true);
    expect(score.sentiment).toBe("positive");
    expect(score.sourcesCount).toBe(1);
  });
});
