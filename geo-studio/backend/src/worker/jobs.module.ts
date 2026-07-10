import { Module, forwardRef } from "@nestjs/common";
import { BrandModule } from "../brand/brand.module";
import { ContentModule } from "../content/content.module";
import { DiagnosticModule } from "../diagnostics/diagnostic.module";
import { DistributionModule } from "../distribution/distribution.module";
import { EngineModule } from "../engine/engine.module";
import { PrismaModule } from "../prisma/prisma.module";
import { JobController } from "./job.controller";
import { JobQueueService } from "./job-queue.service";
import { JobRunnerService } from "./job-runner.service";
import { JobRepository, PrismaJobRepository } from "./job.repository";
import { JobService } from "./job.service";

@Module({
  imports: [
    PrismaModule,
    BrandModule,
    forwardRef(() => DiagnosticModule),
    forwardRef(() => ContentModule),
    forwardRef(() => DistributionModule),
    forwardRef(() => EngineModule),
  ],
  controllers: [JobController],
  providers: [
    JobService,
    JobRunnerService,
    JobQueueService,
    { provide: JobRepository, useClass: PrismaJobRepository },
  ],
  exports: [JobService, JobRunnerService, JobQueueService, JobRepository],
})
export class JobsModule {}
