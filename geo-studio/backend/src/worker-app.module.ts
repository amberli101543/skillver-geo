import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrandModule } from "./brand/brand.module";
import { ContentModule } from "./content/content.module";
import { DiagnosticModule } from "./diagnostics/diagnostic.module";
import { DistributionModule } from "./distribution/distribution.module";
import { PrismaModule } from "./prisma/prisma.module";
import { JobsModule } from "./worker/jobs.module";
import { RetestScheduleRepository, PrismaRetestScheduleRepository } from "./worker/retest-schedule.repository";
import { RetestScheduleService } from "./worker/retest-schedule.service";
import { RetestWorkerService } from "./worker/retest-worker.service";

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    BrandModule,
    DiagnosticModule,
    ContentModule,
    DistributionModule,
    JobsModule,
  ],
  providers: [
    RetestScheduleService,
    RetestWorkerService,
    { provide: RetestScheduleRepository, useClass: PrismaRetestScheduleRepository },
  ],
})
export class WorkerAppModule {}
