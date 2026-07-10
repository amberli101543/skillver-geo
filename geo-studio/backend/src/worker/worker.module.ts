import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrandModule } from "../brand/brand.module";
import { DiagnosticModule } from "../diagnostics/diagnostic.module";
import { JobsModule } from "./jobs.module";
import { RetestScheduleController } from "./retest-schedule.controller";
import { RetestScheduleRepository, PrismaRetestScheduleRepository } from "./retest-schedule.repository";
import { RetestScheduleService } from "./retest-schedule.service";
import { RetestWorkerService } from "./retest-worker.service";

@Module({
  imports: [ScheduleModule.forRoot(), BrandModule, DiagnosticModule, JobsModule],
  controllers: [RetestScheduleController],
  providers: [
    RetestScheduleService,
    RetestWorkerService,
    { provide: RetestScheduleRepository, useClass: PrismaRetestScheduleRepository },
  ],
})
export class WorkerModule {}
