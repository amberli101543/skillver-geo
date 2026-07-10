import { BASELINE_METRICS, type BaselineMetric, type MetricSnapshotRecord } from "../metrics/metric-types";
import { type PublishRecord } from "./publish-record";

export type MetricDeltaDirection = "up" | "down" | "flat" | "pending";

export type DistributionOverallDirection =
  | "improved"
  | "declined"
  | "mixed"
  | "unchanged"
  | "pending"
  | "insufficient_data";

export interface MetricImpactDelta {
  before: number | null;
  after: number | null;
  delta: number | null;
  direction: MetricDeltaDirection;
}

export interface PublishImpactItem {
  publishRecordId: string;
  publishedAt: string;
  contentDraftId: string;
  channel: string;
  beforeCapturedAt: string | null;
  afterCapturedAt: string | null;
  metrics: Record<BaselineMetric, MetricImpactDelta>;
  overallDirection: DistributionOverallDirection;
  summary: string;
}

export interface DistributionImpactResponse {
  brandId: string;
  items: PublishImpactItem[];
}

export interface DiagnosticRunBaseline {
  capturedAt: string;
  diagnosticRunId: string | null;
  values: Record<BaselineMetric, number>;
}

const DELTA_EPSILON = 0.01;
const IMPROVE_THRESHOLD = 0.02;

export function groupSnapshotsToRunBaselines(snapshots: MetricSnapshotRecord[]): DiagnosticRunBaseline[] {
  const byKey = new Map<string, DiagnosticRunBaseline>();

  for (const snap of snapshots) {
    const key = snap.diagnosticRunId ?? snap.capturedAt;
    let run = byKey.get(key);
    if (!run) {
      run = {
        capturedAt: snap.capturedAt,
        diagnosticRunId: snap.diagnosticRunId,
        values: {} as Record<BaselineMetric, number>,
      };
      byKey.set(key, run);
    }
    if ((BASELINE_METRICS as readonly string[]).includes(snap.metric)) {
      run.values[snap.metric as BaselineMetric] = snap.value;
    }
  }

  return [...byKey.values()]
    .filter((run) => BASELINE_METRICS.every((metric) => typeof run.values[metric] === "number"))
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export function pickRunsAroundPublish(
  runs: DiagnosticRunBaseline[],
  publishedAt: string,
): { before: DiagnosticRunBaseline | null; after: DiagnosticRunBaseline | null } {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) {
    return { before: null, after: null };
  }

  let before: DiagnosticRunBaseline | null = null;
  let after: DiagnosticRunBaseline | null = null;

  for (const run of runs) {
    const runTime = Date.parse(run.capturedAt);
    if (Number.isNaN(runTime)) {
      continue;
    }
    if (runTime <= t) {
      before = run;
      continue;
    }
    if (runTime > t && !after) {
      after = run;
      break;
    }
  }

  return { before, after };
}

export function metricDelta(before: number | null, after: number | null): MetricImpactDelta {
  if (before === null || after === null) {
    return {
      before,
      after,
      delta: null,
      direction: "pending",
    };
  }
  const delta = after - before;
  let direction: MetricDeltaDirection = "flat";
  if (delta > DELTA_EPSILON) {
    direction = "up";
  } else if (delta < -DELTA_EPSILON) {
    direction = "down";
  }
  return { before, after, delta, direction };
}

export function resolveOverallDirection(
  metrics: Record<BaselineMetric, MetricImpactDelta>,
  hasBefore: boolean,
  hasAfter: boolean,
): DistributionOverallDirection {
  if (!hasBefore) {
    return "insufficient_data";
  }
  if (!hasAfter) {
    return "pending";
  }

  const primary = [metrics.mention_rate, metrics.avg_accuracy];
  const ups = primary.filter((m) => m.direction === "up").length;
  const downs = primary.filter((m) => m.direction === "down").length;

  if (ups === 0 && downs === 0) {
    return "unchanged";
  }
  if (ups > 0 && downs === 0) {
    const meaningful = primary.some((m) => (m.delta ?? 0) >= IMPROVE_THRESHOLD);
    return meaningful ? "improved" : "unchanged";
  }
  if (downs > 0 && ups === 0) {
    const meaningful = primary.some((m) => (m.delta ?? 0) <= -IMPROVE_THRESHOLD);
    return meaningful ? "declined" : "unchanged";
  }
  return "mixed";
}

const METRIC_LABELS: Record<BaselineMetric, string> = {
  mention_rate: "提及率",
  positive_rate: "正面率",
  avg_accuracy: "准确性",
};

export function buildImpactSummary(
  direction: DistributionOverallDirection,
  metrics: Record<BaselineMetric, MetricImpactDelta>,
): string {
  switch (direction) {
    case "insufficient_data":
      return "分发前无跑批基线，需先完成至少一次诊断跑批";
    case "pending":
      return "分发后尚无新跑批，完成跑批后可观察指标变化";
    case "unchanged":
      return "后续跑批与分发前相比，核心指标基本持平";
    case "improved": {
      const parts: string[] = [];
      for (const metric of BASELINE_METRICS) {
        const delta = metrics[metric];
        if (delta.direction === "up" && delta.delta !== null) {
          parts.push(`${METRIC_LABELS[metric]} +${Math.round(delta.delta * 100)}%`);
        }
      }
      return parts.length ? `分发后趋势向好：${parts.join("、")}` : "分发后核心指标有所改善";
    }
    case "declined": {
      const parts: string[] = [];
      for (const metric of BASELINE_METRICS) {
        const delta = metrics[metric];
        if (delta.direction === "down" && delta.delta !== null) {
          parts.push(`${METRIC_LABELS[metric]} ${Math.round(delta.delta * 100)}%`);
        }
      }
      return parts.length ? `分发后趋势走弱：${parts.join("、")}` : "分发后核心指标有所下滑";
    }
    case "mixed":
      return "分发后指标有升有降，建议结合具体题目明细解读";
  }
}

export function buildPublishImpactItem(
  record: PublishRecord,
  runs: DiagnosticRunBaseline[],
): PublishImpactItem {
  const { before, after } = pickRunsAroundPublish(runs, record.publishedAt);
  const metrics = Object.fromEntries(
    BASELINE_METRICS.map((metric) => [
      metric,
      metricDelta(before?.values[metric] ?? null, after?.values[metric] ?? null),
    ]),
  ) as Record<BaselineMetric, MetricImpactDelta>;

  const overallDirection = resolveOverallDirection(metrics, before !== null, after !== null);

  return {
    publishRecordId: record.id,
    publishedAt: record.publishedAt,
    contentDraftId: record.contentDraftId,
    channel: record.channel,
    beforeCapturedAt: before?.capturedAt ?? null,
    afterCapturedAt: after?.capturedAt ?? null,
    metrics,
    overallDirection,
    summary: buildImpactSummary(overallDirection, metrics),
  };
}

export function buildDistributionImpact(
  brandId: string,
  records: PublishRecord[],
  snapshots: MetricSnapshotRecord[],
): DistributionImpactResponse {
  const runs = groupSnapshotsToRunBaselines(snapshots);
  const items = [...records]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((record) => buildPublishImpactItem(record, runs));

  return { brandId, items };
}
