export const BASELINE_METRICS = ["mention_rate", "positive_rate", "avg_accuracy"] as const;
export type BaselineMetric = (typeof BASELINE_METRICS)[number];

export interface MetricSnapshotRecord {
  id: string;
  brandId: string;
  diagnosticRunId: string | null;
  metric: BaselineMetric;
  value: number;
  capturedAt: string;
}

export interface PersistBaselineInput {
  brandId: string;
  questionCount: number;
  capturedAt: Date;
  values: Record<BaselineMetric, number>;
}

export abstract class MetricSnapshotRepository {
  abstract persistBaseline(input: PersistBaselineInput): Promise<MetricSnapshotRecord[]>;
  abstract listByBrand(brandId: string, metric?: BaselineMetric): Promise<MetricSnapshotRecord[]>;
}
