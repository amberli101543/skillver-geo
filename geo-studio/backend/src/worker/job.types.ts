export const JOB_TYPES = {
  DIAGNOSTIC_BATCH: "diagnostic_batch",
  CONTENT_GENERATE: "content_generate",
  DISTRIBUTION_EXECUTE: "distribution_execute",
  ENGINE_TEST: "engine_test",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface JobFailureAdvice {
  category: string;
  summary: string;
  actions: string[];
}

export interface JobRecord {
  id: string;
  type: JobType;
  brandId: string | null;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: unknown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureAdvice?: JobFailureAdvice;
}

export interface JobAcceptedResponse {
  jobId: string;
  status: "pending";
  type: JobType;
}

export interface DiagnosticBatchJobPayload {
  brandId: string;
  trigger?: string;
  competitors?: string[];
  attributes?: string[];
  engineIds?: string[];
}

export interface ContentGenerateJobPayload {
  brandId: string;
  cellId: string;
}

export interface DistributionExecuteJobPayload {
  brandId: string;
  taskId: string;
}

export interface EngineTestJobPayload {
  brandId: string;
  question: string;
  engineId?: string;
}

export interface CreateJobInput {
  type: JobType;
  brandId: string | null;
  payload: Record<string, unknown>;
}

export interface JobStatusCounts {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface JobStats {
  counts: JobStatusCounts;
  queueDepth: number;
  queueMode: string;
  updatedAt: string;
  /** Latest jobs (newest first), capped — not a paginated list API. */
  recentJobs: JobRecord[];
}
