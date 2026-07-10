import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandRepository } from "../brand/brand-repository";
import { BrandService } from "../brand/brand-service";
import { type Brand, type BrandInput } from "../brand/brand";
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "./engine-connector";
import { EngineTestController } from "./engine-test.controller";
import { EngineTestRunService } from "./engine-test-run.service";
import { EngineTestService } from "./engine-test-service";
import { stubEngineRegistry } from "./engine-registry.test-helper";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { ScoringService } from "../scoring/scoring-service";
import { ProxyScoringPipeline, RuleScoringPipeline } from "../scoring/scoring-pipeline";
import { JobController } from "../worker/job.controller";
import { JobRunnerService } from "../worker/job-runner.service";
import { JobQueueService } from "../worker/job-queue.service";
import { stubJobQueueService } from "../worker/job-queue.test-helper";
import { JobRepository, InMemoryJobRepository } from "../worker/job.repository";
import { JobService } from "../worker/job.service";
import { ContentDraftService } from "../content/content-draft.service";
import { DistributionService } from "../distribution/distribution.service";
import { DiagnosticBatchService } from "../diagnostics/diagnostic-batch-service";

class FakeBrandRepository extends BrandRepository {
  private readonly rows: Brand[] = [];
  private seq = 0;

  async create(input: BrandInput): Promise<Brand> {
    const brand: Brand = { id: `brand_${++this.seq}`, ...input };
    this.rows.push(brand);
    return brand;
  }

  async findById(id: string): Promise<Brand | null> {
    return this.rows.find((b) => b.id === id) ?? null;
  }

  async list(): Promise<Brand[]> {
    return [...this.rows];
  }
  async update(id: string, input: BrandInput): Promise<Brand | null> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return null;
    const next = { id, ...input };
    this.rows[index] = next;
    return next;
  }
  async delete(id: string): Promise<boolean> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return false;
    this.rows.splice(index, 1);
    return true;
  }
}
class FakeEngineConnector extends EngineConnector {
  async run(question: string): Promise<EngineAnswer> {
    return stubEngineAnswer(question);
  }
}

describe("Engine Test API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let jobRunner: JobRunnerService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EngineTestController, JobController],
      providers: [
        BrandService,
        EngineTestRunService,
        ScoringService,
        ScoringAiFacade,
        RuleScoringPipeline,
        ProxyScoringPipeline,
        JobService,
        JobRunnerService,
        { provide: JobQueueService, useValue: stubJobQueueService() },
        { provide: BrandRepository, useClass: FakeBrandRepository },
        {
          provide: EngineTestService,
          useFactory: () =>
            new EngineTestService(
              stubEngineRegistry({ "openai-proxy": new FakeEngineConnector() }),
            ),
        },
        { provide: JobRepository, useClass: InMemoryJobRepository },
        { provide: DiagnosticBatchService, useValue: { runAndPersist: async () => ({}) } },
        { provide: ContentDraftService, useValue: { generateDraft: async () => ({}) } },
        { provide: DistributionService, useValue: { executeTask: async () => ({}) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    jobRunner = moduleRef.get(JobRunnerService);

    const brands = moduleRef.get(BrandService);
    const brand = await brands.create({
      name: "Acme",
      definition: "项目管理 SaaS",
    });
    brandId = brand.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /brands/:id/engine-tests -> 202 with jobId", async () => {
    const res = await request(app.getHttpServer())
      .post(`/brands/${brandId}/engine-tests`)
      .send({ question: "Acme 是什么？" });
    expect(res.status).toBe(202);
    expect(res.body.jobId).toMatch(/^job_/);
    expect(res.body.status).toBe("pending");
    expect(res.body.type).toBe("engine_test");

    const job = await jobRunner.runJob(res.body.jobId);
    expect(job.status).toBe("completed");
    const result = job.result as {
      question: string;
      engineId: string;
      answer: string;
      runAt: string;
      score: { mentioned: boolean; sentiment: string; accuracy: number; sourcesCount: number };
    };
    expect(result.question).toBe("Acme 是什么？");
    expect(result.engineId).toBe("proxy-engine-stub");
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.runAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.score).toMatchObject({
      mentioned: expect.any(Boolean),
      sentiment: expect.stringMatching(/^(positive|neutral|negative)$/),
      accuracy: expect.any(Number),
      sourcesCount: expect.any(Number),
    });
  });

  it("POST for unknown brand -> 404", async () => {
    const res = await request(app.getHttpServer())
      .post("/brands/unknown/engine-tests")
      .send({ question: "test" });
    expect(res.status).toBe(404);
  });

  it("POST with empty question -> 400", async () => {
    const res = await request(app.getHttpServer())
      .post(`/brands/${brandId}/engine-tests`)
      .send({ question: "" });
    expect(res.status).toBe(400);
  });
});
