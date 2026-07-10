import { Injectable, Logger } from "@nestjs/common";
import { ContentDraftService } from "../content/content-draft.service";
import { DiagnosticBatchService } from "../diagnostics/diagnostic-batch-service";
import { DistributionService } from "../distribution/distribution.service";
import { EngineTestRunService } from "../engine/engine-test-run.service";
import { logJobError, logJobEvent } from "./job-log";
import {
  JOB_TYPES,
  type ContentGenerateJobPayload,
  type DiagnosticBatchJobPayload,
  type DistributionExecuteJobPayload,
  type EngineTestJobPayload,
  type JobRecord,
} from "./job.types";
import { JobRepository } from "./job.repository";

@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);

  constructor(
    private readonly repo: JobRepository,
    private readonly batch: DiagnosticBatchService,
    private readonly drafts: ContentDraftService,
    private readonly distribution: DistributionService,
    private readonly engineTests: EngineTestRunService,
  ) {}

  async runJob(jobId: string): Promise<JobRecord> {
    const existing = await this.repo.findById(jobId);
    if (!existing) {
      throw new Error(`job ${jobId} not found`);
    }
    if (existing.status === "completed" || existing.status === "failed") {
      return existing;
    }
    if (existing.status === "running") {
      return existing;
    }

    const startedAt = new Date();
    await this.repo.markRunning(jobId, startedAt);
    logJobEvent(this.logger, "job.started", { jobId, type: existing.type, status: "running" });

    try {
      const result = await this.execute(existing);
      const completed = await this.repo.markCompleted(jobId, result, new Date());
      logJobEvent(this.logger, "job.completed", {
        jobId,
        type: existing.type,
        status: "completed",
        durationMs: Date.now() - startedAt.getTime(),
      });
      return completed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logJobError(this.logger, "job.failed", {
        jobId,
        type: existing.type,
        status: "failed",
        durationMs: Date.now() - startedAt.getTime(),
        error: message,
      });
      return await this.repo.markFailed(jobId, message, new Date());
    }
  }

  private async execute(job: JobRecord): Promise<unknown> {
    switch (job.type) {
      case JOB_TYPES.DIAGNOSTIC_BATCH: {
        const payload = job.payload as unknown as DiagnosticBatchJobPayload;
        return this.batch.runAndPersist(payload.brandId, {
          competitors: payload.competitors,
          attributes: payload.attributes,
          engineIds: payload.engineIds,
        });
      }
      case JOB_TYPES.CONTENT_GENERATE: {
        const payload = job.payload as unknown as ContentGenerateJobPayload;
        return this.drafts.generateDraft(payload.brandId, payload.cellId);
      }
      case JOB_TYPES.DISTRIBUTION_EXECUTE: {
        const payload = job.payload as unknown as DistributionExecuteJobPayload;
        return this.distribution.executeTask(payload.brandId, payload.taskId);
      }
      case JOB_TYPES.ENGINE_TEST: {
        const payload = job.payload as unknown as EngineTestJobPayload;
        return this.engineTests.runForBrand(payload.brandId, payload.question, payload.engineId);
      }
      default:
        throw new Error(`unsupported job type: ${job.type}`);
    }
  }
}
