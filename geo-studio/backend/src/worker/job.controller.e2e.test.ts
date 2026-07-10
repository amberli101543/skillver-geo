import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JobController } from "./job.controller";
import { JobQueueService } from "./job-queue.service";
import { stubJobQueueService } from "./job-queue.test-helper";
import { JobRepository, InMemoryJobRepository } from "./job.repository";
import { JobService } from "./job.service";
import { BrandService } from "../brand/brand-service";
import { JOB_TYPES } from "./job.types";

describe("Job API (e2e)", () => {
  let app: INestApplication;
  let repo: InMemoryJobRepository;

  beforeAll(async () => {
    repo = new InMemoryJobRepository();
    const moduleRef = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        JobService,
        { provide: JobRepository, useValue: repo },
        { provide: JobQueueService, useValue: stubJobQueueService() },
        {
          provide: BrandService,
          useValue: { get: async () => ({ id: "brand_1", name: "Acme", definition: "SaaS" }) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /jobs/stats returns status counts", async () => {
    await repo.create({
      type: JOB_TYPES.ENGINE_TEST,
      brandId: "brand_1",
      payload: { brandId: "brand_1", question: "Q" },
    });
    const running = await repo.create({
      type: JOB_TYPES.DIAGNOSTIC_BATCH,
      brandId: "brand_1",
      payload: { brandId: "brand_1" },
    });
    await repo.markRunning(running.id, new Date());

    const res = await request(app.getHttpServer()).get("/jobs/stats");
    expect(res.status).toBe(200);
    expect(res.body.counts).toMatchObject({
      pending: 1,
      running: 1,
      completed: 0,
      failed: 0,
    });
    expect(res.body.queueMode).toBe("inline");
    expect(typeof res.body.queueDepth).toBe("number");
    expect(Array.isArray(res.body.recentJobs)).toBe(true);
    expect(res.body.recentJobs.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /jobs/stats includes failureAdvice for failed jobs", async () => {
    const job = await repo.create({
      type: JOB_TYPES.DIAGNOSTIC_BATCH,
      brandId: "brand_1",
      payload: { brandId: "brand_1" },
    });
    await repo.markFailed(job.id, "dispatch failed: ECONNREFUSED", new Date());
    const res = await request(app.getHttpServer()).get("/jobs/stats");
    const failed = res.body.recentJobs.find((j: { id: string }) => j.id === job.id);
    expect(failed.failureAdvice.category).toBe("queue");
    expect(failed.failureAdvice.actions.length).toBeGreaterThan(0);
  });

  it("GET /jobs/:jobId returns job record", async () => {
    const job = await repo.create({
      type: JOB_TYPES.ENGINE_TEST,
      brandId: "brand_1",
      payload: { brandId: "brand_1", question: "Q" },
    });
    const res = await request(app.getHttpServer()).get(`/jobs/${job.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(job.id);
    expect(res.body.status).toBe("pending");
  });
});
