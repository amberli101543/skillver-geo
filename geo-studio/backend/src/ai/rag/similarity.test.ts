import { describe, expect, it } from "vitest";
import { cosineSimilarity, keywordOverlapScore } from "./similarity";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });
});

describe("keywordOverlapScore", () => {
  it("scores overlapping tokens", () => {
    expect(keywordOverlapScore("项目管理 SaaS", "Acme 是项目管理 SaaS 平台")).toBeGreaterThan(0);
  });

  it("returns 0 for empty query", () => {
    expect(keywordOverlapScore("", "some text")).toBe(0);
  });
});
