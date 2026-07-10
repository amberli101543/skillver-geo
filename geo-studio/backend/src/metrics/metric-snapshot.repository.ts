import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  BASELINE_METRICS,
  MetricSnapshotRepository,
  type BaselineMetric,
  type MetricSnapshotRecord,
  type PersistBaselineInput,
} from "./metric-types";

function toRecord(row: {
  id: string;
  brandId: string;
  diagnosticRunId: string | null;
  metric: string;
  value: number;
  capturedAt: Date;
}): MetricSnapshotRecord {
  return {
    id: row.id,
    brandId: row.brandId,
    diagnosticRunId: row.diagnosticRunId,
    metric: row.metric as BaselineMetric,
    value: row.value,
    capturedAt: row.capturedAt.toISOString(),
  };
}

@Injectable()
export class PrismaMetricSnapshotRepository extends MetricSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async persistBaseline(input: PersistBaselineInput): Promise<MetricSnapshotRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.diagnosticRun.create({
        data: {
          brandId: input.brandId,
          questionCount: input.questionCount,
          capturedAt: input.capturedAt,
        },
      });
      const rows = await Promise.all(
        BASELINE_METRICS.map((metric) =>
          tx.metricSnapshot.create({
            data: {
              brandId: input.brandId,
              diagnosticRunId: run.id,
              metric,
              value: input.values[metric],
              capturedAt: input.capturedAt,
            },
          }),
        ),
      );
      return rows.map(toRecord);
    });
  }

  async listByBrand(brandId: string, metric?: BaselineMetric): Promise<MetricSnapshotRecord[]> {
    const rows = await this.prisma.metricSnapshot.findMany({
      where: { brandId, ...(metric ? { metric } : {}) },
      orderBy: { capturedAt: "asc" },
    });
    return rows.map(toRecord);
  }
}
