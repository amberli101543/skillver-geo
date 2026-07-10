import { describe, expect, it } from "vitest";
import {
  assertionReflectedInAnswer,
  buildScoreAdvice,
  findMissingAssertions,
  isLowScoreItem,
} from "./scoring-advice";

const context = {
  brandName: "Acme",
  brandDefinition: "面向中小企业的项目管理 SaaS，支持敏捷看板与自动化",
  brandPositioning: "最易上手的团队协作工具",
  assertions: [{ text: "支持 200+ 第三方集成" }, { text: "SOC2 合规认证" }],
};

describe("isLowScoreItem", () => {
  it("flags unmentioned", () => {
    expect(isLowScoreItem({ mentioned: false, sentiment: "neutral", accuracy: 0.9, sourcesCount: 2 })).toBe(
      true,
    );
  });

  it("passes healthy score", () => {
    expect(isLowScoreItem({ mentioned: true, sentiment: "positive", accuracy: 0.8, sourcesCount: 2 })).toBe(
      false,
    );
  });
});

describe("assertionReflectedInAnswer", () => {
  it("detects substring match", () => {
    expect(assertionReflectedInAnswer("支持 200+ 第三方集成", "Acme 支持 200+ 第三方集成")).toBe(true);
    expect(assertionReflectedInAnswer("SOC2 合规认证", "无相关内容")).toBe(false);
  });
});

describe("buildScoreAdvice", () => {
  it("returns undefined for healthy item with assertions covered", () => {
    const advice = buildScoreAdvice(context, {
      questionCategory: "brand",
      questionText: "Acme 怎么样？",
      answer: "Acme 支持 200+ 第三方集成，SOC2 合规认证，面向中小企业的项目管理 SaaS",
      score: { mentioned: true, sentiment: "positive", accuracy: 0.85, sourcesCount: 2 },
    });
    expect(advice).toBeUndefined();
  });

  it("suggests mention fix when brand absent", () => {
    const advice = buildScoreAdvice(context, {
      questionCategory: "brand",
      questionText: "Acme 怎么样？",
      answer: "有一些项目管理工具可选",
      score: { mentioned: false, sentiment: "neutral", accuracy: 0.2, sourcesCount: 0 },
    });
    expect(advice?.issues).toContain("未提及品牌");
    expect(advice?.actions.some((a) => a.category === "mention")).toBe(true);
    expect(advice?.actions.some((a) => a.suggestion.includes("Acme"))).toBe(true);
  });

  it("suggests assertion coverage when missing", () => {
    const advice = buildScoreAdvice(context, {
      questionCategory: "attribute",
      questionText: "Acme 在集成方面表现如何？",
      answer: "Acme 是项目管理 SaaS，功能全面",
      score: { mentioned: true, sentiment: "neutral", accuracy: 0.6, sourcesCount: 1 },
    });
    expect(advice?.missingAssertions).toContain("支持 200+ 第三方集成");
    expect(advice?.actions.some((a) => a.category === "assertion")).toBe(true);
  });

  it("suggests sentiment counter when negative", () => {
    const advice = buildScoreAdvice(context, {
      questionCategory: "comparison",
      questionText: "Acme 和 Beta 哪个更好？",
      answer: "Acme 体验差，不推荐",
      score: { mentioned: true, sentiment: "negative", accuracy: 0.4, sourcesCount: 1 },
    });
    expect(advice?.issues).toContain("情感偏负面");
    expect(advice?.actions.some((a) => a.category === "sentiment")).toBe(true);
  });
});

describe("findMissingAssertions", () => {
  it("returns texts not found in answer", () => {
    expect(findMissingAssertions(context.assertions, "仅提到 SOC2 合规认证")).toEqual([
      "支持 200+ 第三方集成",
    ]);
  });
});
