import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetestScheduleService } from "./retest-schedule.service";
import { RetestWorkerService } from "./retest-worker.service";
import { JobService } from "./job.service";
import { type RetestSchedule } from "./retest-schedule";

describe("RetestWorkerService", () => {
  let schedules: RetestScheduleService;
  let jobs: JobService;
  let worker: RetestWorkerService;

  const dueSchedule: RetestSchedule = {
    brandId: "brand_1",
    enabled: true,
    intervalHours: 24,
    nextRunAt: "2026-06-12T00:00:00.000Z",
  };

  beforeEach(() => {
    schedules = {
      findDue: vi.fn().mockResolvedValue([dueSchedule]),
      markRunComplete: vi.fn().mockResolvedValue({
        ...dueSchedule,
        lastRunAt: "2026-06-12T01:00:00.000Z",
        nextRunAt: "2026-06-13T01:00:00.000Z",
      }),
    } as unknown as RetestScheduleService;

    jobs = {
      enqueueDiagnosticBatch: vi.fn().mockResolvedValue({
        jobId: "job_1",
        status: "pending",
        type: "diagnostic_batch",
      }),
      waitForCompletion: vi.fn().mockResolvedValue({
        id: "job_1",
        status: "completed",
        result: {
          brandId: "brand_1",
          runAt: "2026-06-12T01:00:00.000Z",
          diagnosticRunId: "run_1",
        },
      }),
    } as unknown as JobService;

    worker = new RetestWorkerService(schedules, jobs);
  });

  it("enqueues due schedules and waits for queue completion", async () => {
    const results = await worker.runDueSchedules(new Date("2026-06-12T02:00:00.000Z"));
    expect(jobs.enqueueDiagnosticBatch).toHaveBeenCalledWith("brand_1", { trigger: "retest" });
    expect(jobs.waitForCompletion).toHaveBeenCalledWith("job_1");
    expect(schedules.markRunComplete).toHaveBeenCalledWith(
      "brand_1",
      new Date("2026-06-12T01:00:00.000Z"),
      24,
    );
    expect(results).toEqual([{ brandId: "brand_1", diagnosticRunId: "run_1", jobId: "job_1" }]);
  });

  it("records error without advancing schedule when job fails", async () => {
    vi.mocked(jobs.waitForCompletion).mockResolvedValue({
      id: "job_1",
      status: "failed",
      error: "engine down",
    } as Awaited<ReturnType<JobService["waitForCompletion"]>>);
    const results = await worker.runDueSchedules(new Date("2026-06-12T02:00:00.000Z"));
    expect(schedules.markRunComplete).not.toHaveBeenCalled();
    expect(results[0]?.error).toBe("engine down");
  });
});
