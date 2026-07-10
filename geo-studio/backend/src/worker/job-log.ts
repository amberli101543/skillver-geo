import { Logger } from "@nestjs/common";
import { type JobStatus } from "./job.types";

export interface JobLogFields {
  jobId: string;
  type?: string;
  status?: JobStatus | "dispatched";
  durationMs?: number;
  mode?: string;
  error?: string;
}

export function logJobEvent(logger: Logger, event: string, fields: JobLogFields): void {
  logger.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }));
}

export function logJobError(logger: Logger, event: string, fields: JobLogFields): void {
  logger.error(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }));
}
