import { describe, expect, it } from "vitest";
import {
  buildContentVerification,
  buildVerificationQuestion,
  extractDraftKeyPhrases,
  resolveVerificationDirection,
} from "./content-verification";
import { type MatrixCell } from "../matrix/matrix-cell";

const brand = { id: "b1", name: "Acme", definition: "项目管理 SaaS", positioning: "最易上手" };

function cell(intent: string, angle: string, title: string): MatrixCell {
  return {
    id: "c1",
    brandId: "b1",
    intent,
    angle,
    stage: "全阶段",
    audience: "通用受众",
    title,
    priority: 10,
  };
}

const engineResult = {
  question: "Acme 是什么？",
  engineId: "openai-proxy",
  answer: "Acme 是一款项目管理 SaaS。",
  sources: [{ url: "https://example.com" }],
  runAt: "2026-06-13T00:00:00.000Z",
  score: {
    mentioned: true,
    mentionPosition: 0,
    sentiment: "positive" as const,
    accuracy: 0.85,
    sourcesCount: 1,
  },
};

describe("buildVerificationQuestion", () => {
  it("maps brand intent", () => {
    expect(buildVerificationQuestion(brand, cell("品牌了解", "核心价值", "叙事"))).toBe("Acme 是什么？");
  });

  it("maps attribute intent", () => {
    expect(buildVerificationQuestion(brand, cell("属性认知", "价格", "定价"))).toContain("价格");
  });
});

describe("extractDraftKeyPhrases", () => {
  it("extracts meaningful chunks", () => {
    const phrases = extractDraftKeyPhrases("Acme 是面向团队的项目管理 SaaS。支持敏捷看板与自动化。");
    expect(phrases.length).toBeGreaterThan(0);
  });
});

describe("resolveVerificationDirection", () => {
  it("flags needs_improvement when unmentioned", () => {
    expect(
      resolveVerificationDirection({ mentioned: false, accuracy: 0.2, sentiment: "neutral" }),
    ).toBe("needs_improvement");
  });

  it("returns favorable for strong score", () => {
    expect(
      resolveVerificationDirection({ mentioned: true, accuracy: 0.8, sentiment: "positive" }),
    ).toBe("favorable");
  });
});

describe("buildContentVerification", () => {
  it("builds verification with hints for weak score", () => {
    const verification = buildContentVerification({
      brand,
      cell: cell("品牌了解", "核心价值", "叙事"),
      draftBody: "Acme 是面向团队的项目管理 SaaS。",
      engineResult: {
        ...engineResult,
        answer: "有一些工具可选",
        score: {
          mentioned: false,
          mentionPosition: null,
          sentiment: "neutral",
          accuracy: 0.2,
          sourcesCount: 0,
        },
      },
    });
    expect(verification.direction).toBe("needs_improvement");
    expect(verification.hints.length).toBeGreaterThan(0);
    expect(verification.summary).toContain("未提及");
  });

  it("builds favorable verification", () => {
    const verification = buildContentVerification({
      brand,
      cell: cell("品牌了解", "核心价值", "叙事"),
      draftBody: "Acme 是一款项目管理 SaaS。",
      engineResult,
    });
    expect(verification.direction).toBe("favorable");
    expect(verification.draftAlignment.brandInAnswer).toBe(true);
  });
});
