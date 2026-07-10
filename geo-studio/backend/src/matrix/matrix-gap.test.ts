import { describe, expect, it } from "vitest";
import { analyzeDiagnosticGaps, gapPriority, isGapItem, mapItemToMatrixGap, mergeGaps } from "./matrix-gap";
import { type DiagnosticRunItemRecord } from "../diagnostics/diagnostic-run-types";

function item(
  category: string,
  text: string,
  score: Partial<DiagnosticRunItemRecord["score"]>,
): DiagnosticRunItemRecord {
  return {
    question: {
      id: "q1",
      brandId: "b1",
      diagnosticRunId: "r1",
      category,
      text,
    },
    engineTest: {
      id: "et1",
      questionId: "q1",
      engineId: "stub",
      answer: "answer",
      sources: [],
      runAt: "2026-06-12T00:00:00.000Z",
    },
    score: {
      id: "sc1",
      engineTestId: "et1",
      mentioned: true,
      mentionPosition: 0,
      sentiment: "neutral",
      accuracy: 0.8,
      sourcesCount: 1,
      ...score,
    },
  };
}

describe("isGapItem", () => {
  it("flags unmentioned answers", () => {
    expect(isGapItem(item("brand", "Acme怎么样", { mentioned: false }))).toBe(true);
  });

  it("flags low accuracy", () => {
    expect(isGapItem(item("brand", "Acme怎么样", { accuracy: 0.3 }))).toBe(true);
  });

  it("passes healthy scores", () => {
    expect(
      isGapItem(item("brand", "Acme怎么样", { mentioned: true, accuracy: 0.9, sentiment: "positive" })),
    ).toBe(false);
  });
});

describe("mapItemToMatrixGap", () => {
  it("maps attribute questions", () => {
    const gap = mapItemToMatrixGap(
      item("attribute", "Acme在价格方面表现如何？", { mentioned: false }),
    );
    expect(gap.intent).toBe("属性认知");
    expect(gap.angle).toBe("价格");
    expect(gap.priority).toBeGreaterThanOrEqual(50);
  });

  it("maps comparison questions", () => {
    const gap = mapItemToMatrixGap(
      item("comparison", "Acme和Beta相比哪个更好？", { sentiment: "negative" }),
    );
    expect(gap.intent).toBe("选型对比");
    expect(gap.reasons).toContain("情感偏负面");
  });
});

describe("mergeGaps", () => {
  it("dedupes by intent+angle keeping higher priority", () => {
    const gaps = mergeGaps([
      mapItemToMatrixGap(item("brand", "q1", { mentioned: false })),
      mapItemToMatrixGap(item("brand", "q2", { mentioned: false, accuracy: 0.2 })),
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.priority).toBe(gapPriority(item("brand", "q2", { mentioned: false, accuracy: 0.2 })));
  });
});

describe("analyzeDiagnosticGaps", () => {
  it("returns gaps from run items", () => {
    const analysis = analyzeDiagnosticGaps({
      id: "run_1",
      capturedAt: "2026-06-12T00:00:00.000Z",
      items: [
        item("brand", "Acme怎么样", { mentioned: false }),
        item("category", "有哪些SaaS", { mentioned: true, accuracy: 0.9, sentiment: "positive" }),
      ],
    });
    expect(analysis.diagnosticRunId).toBe("run_1");
    expect(analysis.gaps).toHaveLength(1);
    expect(analysis.gaps[0]?.intent).toBe("品牌了解");
  });
});
