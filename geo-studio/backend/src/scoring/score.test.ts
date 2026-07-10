import { describe, expect, it } from "vitest";
import { scoreEngineTest } from "./score";
import { type Brand } from "../brand/brand";
import { type EngineTestResult } from "../engine/engine-test-service";

const brand: Brand = {
  id: "b1",
  name: "Acme",
  definition: "项目管理 SaaS",
};

function result(answer: string, sourcesCount = 1): EngineTestResult {
  return {
    question: "Acme 是什么？",
    runAt: "2026-06-11T00:00:00.000Z",
    engineId: "proxy-engine-stub",
    answer,
    sources: Array.from({ length: sourcesCount }, (_, i) => ({
      url: `https://example.com/${i}`,
    })),
  };
}

describe("scoreEngineTest", () => {
  it("detects mention and position when brand name appears", () => {
    const score = scoreEngineTest(brand, result("Acme 是优秀的项目管理 SaaS，值得推荐。"));
    expect(score.mentioned).toBe(true);
    expect(score.mentionPosition).toBe(0);
    expect(score.sentiment).toBe("positive");
    expect(score.accuracy).toBe(0.8);
    expect(score.sourcesCount).toBe(1);
  });

  it("returns null position and low accuracy when brand not mentioned", () => {
    const score = scoreEngineTest(brand, result("这是一段未提及品牌的回答。"));
    expect(score.mentioned).toBe(false);
    expect(score.mentionPosition).toBe(null);
    expect(score.sentiment).toBe("neutral");
    expect(score.accuracy).toBe(0.2);
  });

  it("detects negative sentiment", () => {
    const score = scoreEngineTest(brand, result("Acme 体验差，不推荐使用。"));
    expect(score.sentiment).toBe("negative");
    expect(score.accuracy).toBe(0.5);
  });

  it("is deterministic for the same input", () => {
    const r = result("Acme 是项目管理 SaaS。");
    expect(scoreEngineTest(brand, r)).toEqual(scoreEngineTest(brand, r));
  });
});
