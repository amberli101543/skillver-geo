import { describe, expect, it } from "vitest";
import { buildEngineTrendMap, MetricsService } from "./metrics.service";
import {
  BASELINE_METRICS,
  MetricSnapshotRepository,
  type MetricSnapshotRecord,
  type PersistBaselineInput,
  type BaselineMetric,
} from "./metric-types";
import { type EngineRunBaselinePoint } from "../diagnostics/diagnostic-run-types";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";

class InMemoryMetricSnapshotRepository extends MetricSnapshotRepository {
  private readonly rows: MetricSnapshotRecord[] = [];
  private seq = 0;

  async persistBaseline(input: PersistBaselineInput): Promise<MetricSnapshotRecord[]> {
    const runId = `run_${++this.seq}`;
    const capturedAt = input.capturedAt.toISOString();
    const created = BASELINE_METRICS.map((metric) => ({
      id: `snap_${++this.seq}`,
      brandId: input.brandId,
      diagnosticRunId: runId,
      metric,
      value: input.values[metric],
      capturedAt,
    }));
    this.rows.push(...created);
    return created;
  }

  async listByBrand(brandId: string, metric?: BaselineMetric): Promise<MetricSnapshotRecord[]> {
    return this.rows.filter(
      (r) => r.brandId === brandId && (metric === undefined || r.metric === metric),
    );
  }
}

function stubRunService(points: EngineRunBaselinePoint[]): DiagnosticRunService {
  return {
    listEngineBaselinesByRun: async () => points,
  } as unknown as DiagnosticRunService;
}

describe("buildEngineTrendMap", () => {
  it("groups points by engine into metric series", () => {
    const points: EngineRunBaselinePoint[] = [
      {
        diagnosticRunId: "r1",
        capturedAt: "2026-06-11T12:00:00.000Z",
        engineId: "openai-proxy",
        mentionRate: 0.5,
        positiveRate: 0.3,
        avgAccuracy: 0.6,
      },
      {
        diagnosticRunId: "r1",
        capturedAt: "2026-06-11T12:00:00.000Z",
        engineId: "perplexity",
        mentionRate: 0.8,
        positiveRate: 0.4,
        avgAccuracy: 0.7,
      },
    ];
    const byEngine = buildEngineTrendMap(points);
    expect(Object.keys(byEngine).sort()).toEqual(["openai-proxy", "perplexity"]);
    expect(byEngine["openai-proxy"]?.[0]?.points[0]?.value).toBe(0.5);
    expect(byEngine.perplexity?.[0]?.points[0]?.value).toBe(0.8);
  });
});

describe("MetricsService", () => {
  it("persists baseline and returns aggregate trend series", async () => {
    const repo = new InMemoryMetricSnapshotRepository();
    const svc = new MetricsService(repo, stubRunService([]));
    const at = new Date("2026-06-11T12:00:00.000Z");
    await svc.persistFromBaseline(
      "b1",
      {
        questionCount: 3,
        mentionRate: 0.6,
        positiveRate: 0.3,
        avgAccuracy: 0.5,
        sentimentBreakdown: { positive: 1, neutral: 1, negative: 1 },
      },
      at,
    );
    const trend = await svc.getTrend("b1");
    expect(trend.series).toHaveLength(3);
    expect(trend.series[0]?.points[0]?.value).toBe(0.6);
    expect(trend.byEngine).toEqual({});
  });

  it("returns per-engine series and filters by engineId query", async () => {
    const repo = new InMemoryMetricSnapshotRepository();
    const enginePoints: EngineRunBaselinePoint[] = [
      {
        diagnosticRunId: "r1",
        capturedAt: "2026-06-11T12:00:00.000Z",
        engineId: "openai-proxy",
        mentionRate: 0.4,
        positiveRate: 0.2,
        avgAccuracy: 0.5,
      },
      {
        diagnosticRunId: "r1",
        capturedAt: "2026-06-11T12:00:00.000Z",
        engineId: "perplexity",
        mentionRate: 0.9,
        positiveRate: 0.5,
        avgAccuracy: 0.8,
      },
    ];
    const svc = new MetricsService(repo, stubRunService(enginePoints));
    const all = await svc.getTrend("b1");
    expect(all.byEngine["perplexity"]?.[0]?.points[0]?.value).toBe(0.9);

    const filtered = await svc.getTrend("b1", "openai-proxy");
    expect(filtered.engineId).toBe("openai-proxy");
    expect(filtered.series[0]?.points[0]?.value).toBe(0.4);
  });
});
