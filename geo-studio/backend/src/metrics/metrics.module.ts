import { Module, forwardRef } from "@nestjs/common";
import { BrandModule } from "../brand/brand.module";
import { DiagnosticModule } from "../diagnostics/diagnostic.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MetricSnapshotRepository } from "./metric-types";
import { PrismaMetricSnapshotRepository } from "./metric-snapshot.repository";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

@Module({
  imports: [PrismaModule, BrandModule, forwardRef(() => DiagnosticModule)],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    { provide: MetricSnapshotRepository, useClass: PrismaMetricSnapshotRepository },
  ],
  exports: [MetricsService, MetricSnapshotRepository],
})
export class MetricsModule {}
