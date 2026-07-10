import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { BrandNotFoundError } from "../diagnostics/diagnostic-service";
import {
  JOB_TYPES,
  type ContentGenerateJobPayload,
  type DiagnosticBatchJobPayload,
  type DistributionExecuteJobPayload,
  type EngineTestJobPayload,
  type JobAcceptedResponse,
  type JobRecord,
  type JobStats,
} from "./job.types";
import { enrichJobWithFailureAdvice } from "./job-failure-advice";
import { JobQueueService } from "./job-queue.service";
import { JobRepository } from "./job.repository";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly repo: JobRepository,
    private readonly brands: BrandService,
    private readonly queue: JobQueueService,
  ) {}

  async getJob(jobId: string): Promise<JobRecord> {
    const job = await this.repo.findById(jobId);
    if (!job) {
      throw new NotFoundException(`job ${jobId} not found`);
    }
    return enrichJobWithFailureAdvice(job);
  }

  async getStats(): Promise<JobStats> {
    const [counts, queueDepth, recentJobs] = await Promise.all([
      this.repo.countByStatus(),
      this.queue.getQueueDepth(),
      this.repo.listRecent(10),
    ]);
    return {
      counts,
      queueDepth,
      queueMode: this.queue.mode,
      updatedAt: new Date().toISOString(),
      recentJobs: recentJobs.map(enrichJobWithFailureAdvice),
    };
  }

  async enqueueDiagnosticBatch(
    brandId: string,
    extra: Partial<DiagnosticBatchJobPayload> = {},
  ): Promise<JobAcceptedResponse> {
    await this.requireBrand(brandId);
    const job = await this.persistAndDispatch({
      type: JOB_TYPES.DIAGNOSTIC_BATCH,
      brandId,
      payload: { brandId, ...extra },
    });
    return { jobId: job.id, status: "pending", type: job.type };
  }

  async enqueueContentGenerate(brandId: string, cellId: string): Promise<JobAcceptedResponse> {
    await this.requireBrand(brandId);
    const job = await this.persistAndDispatch({
      type: JOB_TYPES.CONTENT_GENERATE,
      brandId,
      payload: { brandId, cellId } satisfies ContentGenerateJobPayload,
    });
    return { jobId: job.id, status: "pending", type: job.type };
  }

  async enqueueDistributionExecute(brandId: string, taskId: string): Promise<JobAcceptedResponse> {
    await this.requireBrand(brandId);
    const job = await this.persistAndDispatch({
      type: JOB_TYPES.DISTRIBUTION_EXECUTE,
      brandId,
      payload: { brandId, taskId } satisfies DistributionExecuteJobPayload,
    });
    return { jobId: job.id, status: "pending", type: job.type };
  }

  async enqueueEngineTest(
    brandId: string,
    question: string,
    engineId?: string,
  ): Promise<JobAcceptedResponse> {
    await this.requireBrand(brandId);
    const payload: EngineTestJobPayload = {
      brandId,
      question: question.trim(),
      ...(engineId?.trim() ? { engineId: engineId.trim() } : {}),
    };
    const job = await this.persistAndDispatch({
      type: JOB_TYPES.ENGINE_TEST,
      brandId,
      payload: payload as unknown as Record<string, unknown>,
    });
    return { jobId: job.id, status: "pending", type: job.type };
  }

  async listPending(limit = 10): Promise<JobRecord[]> {
    return this.repo.listPending(limit);
  }

  async waitForCompletion(
    jobId: string,
    options: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<JobRecord> {
    const timeoutMs = options.timeoutMs ?? 120_000;
    const intervalMs = options.intervalMs ?? 200;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const job = await this.getJob(jobId);
      if (job.status === "completed" || job.status === "failed") {
        return job;
      }
      await sleep(intervalMs);
    }

    this.logger.warn(`job ${jobId} timed out after ${timeoutMs}ms`);
    throw new Error(`job ${jobId} timed out`);
  }

  private async persistAndDispatch(input: Parameters<JobRepository["create"]>[0]): Promise<JobRecord> {
    const job = await this.repo.create(input);
    try {
      await this.queue.dispatch(job.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.markFailed(job.id, `dispatch failed: ${message}`, new Date());
      throw err;
    }
    return job;
  }

  private async requireBrand(brandId: string): Promise<void> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundError(brandId);
    }
  }
}
