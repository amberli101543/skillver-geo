import { describe, expect, it } from "vitest";
import { computeBaseline } from "./baseline";
import { type TestScore } from "../scoring/score";

const score = (partial: Partial<TestScore>): TestScore => ({
  mentioned: false,
  mentionPosition: null,
  sentiment: "neutral",
  accuracy: 0.5,
  sourcesCount: 1,
  ...partial,
});

describe("computeBaseline", () => {
  it("aggregates mention rate, positive rate, and avg accuracy", () => {
    const scores: TestScore[] = [
      score({ mentioned: true, sentiment: "positive", accuracy: 0.8 }),
      score({ mentioned: false, sentiment: "neutral", accuracy: 0.2 }),
      score({ mentioned: true, sentiment: "negative", accuracy: 0.5 }),
    ];
    const b = computeBaseline(scores);
    expect(b.questionCount).toBe(3);
    expect(b.mentionRate).toBeCloseTo(2 / 3);
    expect(b.positiveRate).toBeCloseTo(1 / 3);
    expect(b.avgAccuracy).toBeCloseTo((0.8 + 0.2 + 0.5) / 3);
    expect(b.sentimentBreakdown).toEqual({ positive: 1, neutral: 1, negative: 1 });
  });

  it("returns zeros for empty input", () => {
    const b = computeBaseline([]);
    expect(b.questionCount).toBe(0);
    expect(b.mentionRate).toBe(0);
  });
});
