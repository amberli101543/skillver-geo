import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandService } from "../brand/brand-service";
import { JobQueueService } from "./job-queue.service";
import { InMemoryJobRepository } from "./job.repository";
import { JobService } from "./job.service";
import { JOB_TYPES } from "./job.types";

describe("JobService", () => {
  let service: JobService;
  let repo: InMemoryJobRepository;

  beforeEach(() => {
    repo = new InMemoryJobRepository();
    const brands = {
      get: vi.fn().mockResolvedValue({ id: "brand_1", name: "Acme", definition: "SaaS" }),
    } as unknown as BrandService;
    const queue = {
      mode: "inline",
      dispatch: vi.fn(),
      getQueueDepth: vi.fn().mockResolvedValue(0),
    } as unknown as JobQueueService;
    service = new JobService(repo, brands, queue);
  });

  it("getStats returns status counts and queue metadata", async () => {
    await repo.create({
      type: JOB_TYPES.ENGINE_TEST,
      brandId: "brand_1",
      payload: { brandId: "brand_1", question: "Q" },
    });
    await repo.create({
      type: JOB_TYPES.DIAGNOSTIC_BATCH,
      brandId: "brand_1",
      payload: { brandId: "brand_1" },
    });
    const running = await repo.create({
      type: JOB_TYPES.CONTENT_GENERATE,
      brandId: "brand_1",
      payload: { brandId: "brand_1", cellId: "cell_1" },
    });
    await repo.markRunning(running.id, new Date());
    await repo.markCompleted(
      (
        await repo.create({
          type: JOB_TYPES.DISTRIBUTION_EXECUTE,
          brandId: "brand_1",
          payload: { brandId: "brand_1", taskId: "task_1" },
        })
      ).id,
      {},
      new Date(),
    );
    await repo.markFailed(
      (
        await repo.create({
          type: JOB_TYPES.ENGINE_TEST,
          brandId: "brand_1",
          payload: { brandId: "brand_1", question: "Q2" },
        })
      ).id,
      "boom",
      new Date(),
    );

    const stats = await service.getStats();
    expect(stats.counts).toEqual({
      pending: 2,
      running: 1,
      completed: 1,
      failed: 1,
    });
    expect(stats.queueDepth).toBe(0);
    expect(stats.queueMode).toBe("inline");
    expect(stats.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const failed = stats.recentJobs.find((j) => j.status === "failed");
    expect(failed?.failureAdvice?.actions.length).toBeGreaterThan(0);
  });
});
