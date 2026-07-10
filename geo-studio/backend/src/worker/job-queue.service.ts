import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Job, Queue, Worker } from "bullmq";
import { isApiProcess, isWorkerProcess } from "../process-role";
import { JobRunnerService } from "./job-runner.service";
import {
  GEO_JOB_QUEUE_NAME,
  jobQueueConcurrency,
  jobQueueMode,
  redisConnectionOptions,
} from "./job-queue.config";
import { logJobError, logJobEvent } from "./job-log";

export interface JobQueueMessage {
  jobId: string;
}

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private queue: Queue<JobQueueMessage> | null = null;
  private worker: Worker<JobQueueMessage> | null = null;

  constructor(private readonly runner: JobRunnerService) {}

  get mode() {
    return jobQueueMode();
  }

  async onModuleInit(): Promise<void> {
    if (process.env.JOB_WORKER_ENABLED === "false") {
      logJobEvent(this.logger, "queue.disabled", { jobId: "-", mode: this.mode });
      return;
    }

    if (this.mode === "inline") {
      logJobEvent(this.logger, "queue.ready", { jobId: "-", mode: "inline" });
      return;
    }

    const connection = redisConnectionOptions();

    if (isApiProcess()) {
      this.queue = new Queue<JobQueueMessage>(GEO_JOB_QUEUE_NAME, { connection });
      logJobEvent(this.logger, "queue.producer.ready", { jobId: "-", mode: "bullmq" });
    }

    if (isWorkerProcess()) {
      this.worker = new Worker<JobQueueMessage>(
        GEO_JOB_QUEUE_NAME,
        async (job) => this.runner.runJob(job.data.jobId),
        {
          connection,
          concurrency: jobQueueConcurrency(),
        },
      );

      this.worker.on("failed", (job, err) => {
        const jobId = job?.data.jobId ?? "unknown";
        logJobError(this.logger, "queue.job.failed", {
          jobId,
          mode: "bullmq",
          status: "failed",
          error: err.message,
        });
      });

      logJobEvent(this.logger, "queue.consumer.ready", {
        jobId: "-",
        mode: "bullmq",
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async dispatch(jobId: string): Promise<void> {
    logJobEvent(this.logger, "job.dispatched", { jobId, mode: this.mode, status: "dispatched" });

    if (this.mode === "inline") {
      void this.runner.runJob(jobId).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        logJobError(this.logger, "job.inline.failed", {
          jobId,
          mode: "inline",
          status: "failed",
          error: message,
        });
      });
      return;
    }

    if (!this.queue) {
      throw new Error("BullMQ queue is not initialized");
    }

    await this.queue.add(
      "run",
      { jobId },
      {
        jobId,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async getQueueDepth(): Promise<number> {
    if (!this.queue) {
      return 0;
    }
    const counts = await this.queue.getJobCounts("waiting", "active", "delayed");
    return (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
  }
}

export type { Job };
