import { Injectable } from "@nestjs/common";
import { type EngineRunBaselinePoint } from "../diagnostics/diagnostic-run-types";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import { type BaselineSummary } from "../diagnostics/baseline";
import {
  BASELINE_METRICS,
  MetricSnapshotRepository,
  type BaselineMetric,
  type MetricSnapshotRecord,
} from "./metric-types";

export interface MetricTrendPoint {
  value: number;
  capturedAt: string;
}

export interface MetricTrendSeries {
  metric: BaselineMetric;
  points: MetricTrendPoint[];
}

export interface BrandMetricsTrend {
  brandId: string;
  /** Set when `?engineId=` filters the primary `series`. */
  engineId?: string;
  /** Aggregate trend from MetricSnapshot (all engines blended). */
  series: MetricTrendSeries[];
  /** Per-engine trends computed from diagnostic run items (GEO-040). */
  byEngine: Record<string, MetricTrendSeries[]>;
}

function emptySeries(): MetricTrendSeries[] {
  return BASELINE_METRICS.map((metric) => ({ metric, points: [] }));
}

function baselineValue(point: EngineRunBaselinePoint, metric: BaselineMetric): number {
  switch (metric) {
    case "mention_rate":
      return point.mentionRate;
    case "positive_rate":
      return point.positiveRate;
    case "avg_accuracy":
      return point.avgAccuracy;
  }
}

export function buildEngineTrendMap(points: EngineRunBaselinePoint[]): Record<string, MetricTrendSeries[]> {
  const engineIds = [...new Set(points.map((p) => p.engineId))].sort();
  const byEngine: Record<string, MetricTrendSeries[]> = {};
  for (const engineId of engineIds) {
    const filtered = points.filter((p) => p.engineId === engineId);
    byEngine[engineId] = BASELINE_METRICS.map((metric) => ({
      metric,
      points: filtered.map((p) => ({
        value: baselineValue(p, metric),
        capturedAt: p.capturedAt,
      })),
    }));
  }
  return byEngine;
}

@Injectable()
export class MetricsService {
  constructor(
    private readonly repo: MetricSnapshotRepository,
    private readonly runs: DiagnosticRunService,
  ) {}

  async persistFromBaseline(
    brandId: string,
    baseline: BaselineSummary,
    capturedAt: Date,
  ): Promise<MetricSnapshotRecord[]> {
    return this.repo.persistBaseline({
      brandId,
      questionCount: baseline.questionCount,
      capturedAt,
      values: {
        mention_rate: baseline.mentionRate,
        positive_rate: baseline.positiveRate,
        avg_accuracy: baseline.avgAccuracy,
      },
    });
  }

  async getTrend(brandId: string, engineId?: string): Promise<BrandMetricsTrend> {
    const rows = await this.repo.listByBrand(brandId);
    const aggregateSeries: MetricTrendSeries[] = BASELINE_METRICS.map((metric) => ({
      metric,
      points: rows
        .filter((r) => r.metric === metric)
        .map((r) => ({ value: r.value, capturedAt: r.capturedAt })),
    }));

    const enginePoints = await this.runs.listEngineBaselinesByRun(brandId);
    const byEngine = buildEngineTrendMap(enginePoints);

    const trimmedEngineId = engineId?.trim();
    const series =
      trimmedEngineId && byEngine[trimmedEngineId]
        ? byEngine[trimmedEngineId]
        : trimmedEngineId
          ? emptySeries()
          : aggregateSeries;

    return {
      brandId,
      ...(trimmedEngineId ? { engineId: trimmedEngineId } : {}),
      series,
      byEngine,
    };
  }
}
