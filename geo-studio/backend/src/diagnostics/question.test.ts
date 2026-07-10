import { describe, expect, it } from "vitest";
import { generateQuestionSet, type Question, type QuestionCategory } from "./question";
import { type Brand } from "../brand/brand";

const brand: Brand = { id: "b1", name: "Acme", definition: "项目管理 SaaS" };

function categories(qs: Question[]): Set<QuestionCategory> {
  return new Set(qs.map((q) => q.category));
}

describe("generateQuestionSet", () => {
  it("covers all four categories when competitors and attributes are provided", () => {
    const qs = generateQuestionSet(brand, { competitors: ["Beta"], attributes: ["价格", "安全"] });
    expect(categories(qs)).toEqual(new Set(["category", "brand", "attribute", "comparison"]));
  });

  it("skips comparison when there are no competitors", () => {
    const qs = generateQuestionSet(brand, { attributes: ["价格"] });
    expect(qs.some((q) => q.category === "comparison")).toBe(false);
    expect(qs.some((q) => q.category === "attribute")).toBe(true);
  });

  it("always includes category and brand questions embedding the brand name", () => {
    const qs = generateQuestionSet(brand);
    expect(qs.some((q) => q.category === "category")).toBe(true);
    expect(qs.some((q) => q.category === "brand")).toBe(true);
    expect(qs.every((q) => q.text.length > 0)).toBe(true);
    expect(qs.some((q) => q.text.includes("Acme"))).toBe(true);
  });

  it("emits one question per competitor and per attribute, ignoring blanks", () => {
    const qs = generateQuestionSet(brand, {
      competitors: ["Beta", "Gamma", "  "],
      attributes: ["价格"],
    });
    expect(qs.filter((q) => q.category === "comparison")).toHaveLength(2);
    expect(qs.filter((q) => q.category === "attribute")).toHaveLength(1);
  });
});
