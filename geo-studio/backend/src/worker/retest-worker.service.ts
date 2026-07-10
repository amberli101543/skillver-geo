import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { isWorkerProcess } from "../process-role";
import { type DiagnosticBatchResult } from "../diagnostics/diagnostic-batch-service";
import { JobService } from "./job.service";
import { RetestScheduleService } from "./retest-schedule.service";

export interface RetestWorkerRunResult {
  brandId: string;
  diagnosticRunId?: string;
  jobId?: string;
  error?: string;
}

@Injectable()
export class RetestWorkerService {
  private readonly logger = new Logger(RetestWorkerService.name);

  constructor(
    private readonly schedules: RetestScheduleService,
    private readonly jobs: JobService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async onTick(): Promise<void> {
    if (!isWorkerProcess()) {
      return;
    }
    if (process.env.RETEST_WORKER_ENABLED === "false") {
      return;
    }
    await this.runDueSchedules();
  }

  async runDueSchedules(now = new Date()): Promise<RetestWorkerRunResult[]> {
    const due = await this.schedules.findDue(now);
    const results: RetestWorkerRunResult[] = [];

    for (const schedule of due) {
      try {
        const accepted = await this.jobs.enqueueDiagnosticBatch(schedule.brandId, {
          trigger: "retest",
        });
        const job = await this.jobs.waitForCompletion(accepted.jobId);
        if (job.status === "failed") {
          throw new Error(job.error ?? "diagnostic batch job failed");
        }
        const batch = job.result as DiagnosticBatchResult;
        await this.schedules.markRunComplete(
          schedule.brandId,
          new Date(batch.runAt),
          schedule.intervalHours,
        );
        results.push({
          brandId: schedule.brandId,
          diagnosticRunId: batch.diagnosticRunId,
          jobId: job.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`retest failed for brand ${schedule.brandId}: ${message}`);
        results.push({ brandId: schedule.brandId, error: message });
      }
    }

    return results;
  }
}
