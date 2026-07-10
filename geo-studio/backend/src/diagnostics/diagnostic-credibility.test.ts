import { describe, expect, it } from "vitest";
import { assessDiagnosticCredibility, isStubEngineTest } from "./diagnostic-credibility";

function item(
  engineId: string,
  answer: string,
  sourcesCount: number,
): {
  engineTest: { engineId: string; answer: string; sources: [] };
  score: { sourcesCount: number };
} {
  return {
    engineTest: { engineId, answer, sources: [] },
    score: { sourcesCount },
  };
}

describe("isStubEngineTest", () => {
  it("detects proxy-engine-stub and *-stub ids", () => {
    expect(isStubEngineTest("proxy-engine-stub")).toBe(true);
    expect(isStubEngineTest("perplexity-stub")).toBe(true);
    expect(isStubEngineTest("openai:gpt-4o")).toBe(false);
  });

  it("detects stub prefix in answer", () => {
    expect(isStubEngineTest("openai-proxy", "[stub] demo")).toBe(true);
  });
});

describe("assessDiagnosticCredibility", () => {
  it("returns demo when all items are stub", () => {
    const result = assessDiagnosticCredibility({
      scoringMode: "llm",
      items: [
        item("proxy-engine-stub", "[stub] a", 1),
        item("perplexity-stub", "[stub] b", 1),
      ],
    });
    expect(result.level).toBe("demo");
    expect(result.label).toBe("演示模式");
    expect(result.stubItemRatio).toBe(1);
  });

  it("returns demo when stub ratio >= 50%", () => {
    const result = assessDiagnosticCredibility({
      scoringMode: "llm",
      items: [
        item("proxy-engine-stub", "[stub] a", 2),
        item("openai:gpt-4o", "live answer", 2),
      ],
    });
    expect(result.level).toBe("demo");
  });

  it("returns partial for rule scoring with live engines", () => {
    const result = assessDiagnosticCredibility({
      scoringMode: "rule",
      items: [item("openai:gpt-4o", "live", 2), item("openai:gpt-4o", "live", 2)],
    });
    expect(result.level).toBe("partial");
    expect(result.reasons.some((r) => r.includes("规则"))).toBe(true);
  });

  it("returns partial when avg sources below threshold", () => {
    const result = assessDiagnosticCredibility({
      scoringMode: "llm",
      items: [item("openai:gpt-4o", "live", 0), item("openai:gpt-4o", "live", 0)],
    });
    expect(result.level).toBe("partial");
  });

  it("returns business-ready for full live llm run with sources", () => {
    const result = assessDiagnosticCredibility({
      scoringMode: "llm",
      items: [
        item("openai:gpt-4o", "Acme is a SaaS", 2),
        item("perplexity", "Perplexity live", 3),
      ],
    });
    expect(result.level).toBe("business-ready");
    expect(result.label).toBe("可决策");
    expect(result.liveEngineIds).toEqual(["openai:gpt-4o", "perplexity"]);
  });

  it("returns demo for empty items", () => {
    const result = assessDiagnosticCredibility({ items: [] });
    expect(result.level).toBe("demo");
  });
});
