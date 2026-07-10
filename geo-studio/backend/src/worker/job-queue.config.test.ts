import { afterEach, describe, expect, it } from "vitest";
import { jobQueueConcurrency, jobQueueMode } from "./job-queue.config";

describe("job-queue.config", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("defaults to inline mode without redis", () => {
    delete process.env.REDIS_URL;
    delete process.env.JOB_QUEUE_MODE;
    expect(jobQueueMode()).toBe("inline");
  });

  it("uses bullmq when REDIS_URL is set", () => {
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    expect(jobQueueMode()).toBe("bullmq");
  });

  it("forces inline when JOB_QUEUE_MODE=inline", () => {
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    process.env.JOB_QUEUE_MODE = "inline";
    expect(jobQueueMode()).toBe("inline");
  });

  it("parses queue concurrency", () => {
    process.env.JOB_QUEUE_CONCURRENCY = "4";
    expect(jobQueueConcurrency()).toBe(4);
  });
});
