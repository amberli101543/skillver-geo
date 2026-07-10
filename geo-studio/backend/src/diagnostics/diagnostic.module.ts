import { Module, forwardRef } from "@nestjs/common";
import { BrandModule } from "../brand/brand.module";
import { EngineModule } from "../engine/engine.module";
import { MetricsModule } from "../metrics/metrics.module";
import { ScoringModule } from "../scoring/scoring.module";
import { AlertModule } from "../alert/alert.module";
import { JobsModule } from "../worker/jobs.module";
import { DiagnosticBatchController } from "./diagnostic-batch.controller";
import { DiagnosticBatchService } from "./diagnostic-batch-service";
import { DiagnosticController } from "./diagnostic.controller";
import { DiagnosticRunController } from "./diagnostic-run.controller";
import { DiagnosticRunRepository } from "./diagnostic-run-types";
import { PrismaDiagnosticRunRepository } from "./diagnostic-run.repository";
import { DiagnosticRunService } from "./diagnostic-run.service";
import { DiagnosticService } from "./diagnostic-service";

@Module({
  imports: [BrandModule, EngineModule, ScoringModule, forwardRef(() => MetricsModule), forwardRef(() => AlertModule), forwardRef(() => JobsModule)],
  controllers: [DiagnosticController, DiagnosticBatchController, DiagnosticRunController],
  providers: [
    DiagnosticService,
    DiagnosticBatchService,
    DiagnosticRunService,
    { provide: DiagnosticRunRepository, useClass: PrismaDiagnosticRunRepository },
  ],
  exports: [DiagnosticService, DiagnosticBatchService, DiagnosticRunService],
})
export class DiagnosticModule {}
