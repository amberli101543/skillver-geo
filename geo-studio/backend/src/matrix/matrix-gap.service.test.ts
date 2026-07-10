import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import { MatrixCellService } from "./matrix-cell.service";
import { MatrixGapService } from "./matrix-gap.service";
import { type DiagnosticRunDetail, type DiagnosticRunSummary } from "../diagnostics/diagnostic-run-types";
import { runCredibility } from "../diagnostics/diagnostic-credibility.test-helper";

describe("MatrixGapService", () => {
  let runs: DiagnosticRunService;
  let cells: MatrixCellService;
  let service: MatrixGapService;

  const summary: DiagnosticRunSummary = {
    id: "run_1",
    brandId: "brand_1",
    questionCount: 1,
    capturedAt: "2026-06-12T00:00:00.000Z",
    metrics: {},
    credibility: runCredibility([
      {
        engineTest: { engineId: "stub", answer: "一般", sources: [] },
        score: { sourcesCount: 0 },
      },
    ]),
  };

  const detail: DiagnosticRunDetail = {
    ...summary,
    baseline: {
      questionCount: 1,
      mentionRate: 0,
      positiveRate: 0,
      avgAccuracy: 0.2,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 1 },
    },
    items: [
      {
        question: {
          id: "q1",
          brandId: "brand_1",
          diagnosticRunId: "run_1",
          category: "brand",
          text: "Acme怎么样",
        },
        engineTest: {
          id: "et1",
          questionId: "q1",
          engineId: "stub",
          answer: "一般",
          sources: [],
          runAt: "2026-06-12T00:00:00.000Z",
        },
        score: {
          id: "sc1",
          engineTestId: "et1",
          mentioned: false,
          mentionPosition: null,
          sentiment: "negative",
          accuracy: 0.2,
          sourcesCount: 0,
        },
      },
    ],
  };

  beforeEach(() => {
    runs = {
      list: vi.fn().mockResolvedValue([summary]),
      get: vi.fn().mockResolvedValue(detail),
    } as unknown as DiagnosticRunService;

    cells = {
      upsertFromGap: vi.fn().mockResolvedValue({
        id: "cell_1",
        brandId: "brand_1",
        intent: "品牌了解",
        angle: "核心价值",
        title: "强化品牌核心叙事",
        priority: 80,
      }),
    } as unknown as MatrixCellService;

    service = new MatrixGapService(runs, cells);
  });

  it("analyzes latest run gaps", async () => {
    const analysis = await service.analyzeLatestGaps("brand_1");
    expect(analysis.gaps).toHaveLength(1);
    expect(analysis.gaps[0]?.intent).toBe("品牌了解");
  });

  it("syncs gaps into matrix cells", async () => {
    const result = await service.syncLatestGaps("brand_1");
    expect(cells.upsertFromGap).toHaveBeenCalledOnce();
    expect(result.cells).toHaveLength(1);
  });
});
