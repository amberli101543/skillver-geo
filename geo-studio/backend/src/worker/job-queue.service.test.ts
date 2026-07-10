import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobQueueService } from "./job-queue.service";
import { JobRunnerService } from "./job-runner.service";

describe("JobQueueService", () => {
  let runner: JobRunnerService;
  let queue: JobQueueService;

  beforeEach(() => {
    process.env.JOB_QUEUE_MODE = "inline";
    runner = {
      runJob: vi.fn().mockResolvedValue({ id: "job_1", status: "completed" }),
    } as unknown as JobRunnerService;
    queue = new JobQueueService(runner);
  });

  it("dispatches inline jobs through JobRunnerService", async () => {
    await queue.dispatch("job_1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runner.runJob).toHaveBeenCalledWith("job_1");
  });
});
