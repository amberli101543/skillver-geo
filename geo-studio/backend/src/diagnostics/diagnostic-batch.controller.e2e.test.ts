import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandRepository } from "../brand/brand-repository";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { BrandService } from "../brand/brand-service";
import { BrandEntityService } from "../brand/brand-entity.service";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion, type AssertionInput } from "../brand/assertion";
import { type Competitor, type CompetitorInput } from "../brand/competitor";
import { EngineTestService } from "../engine/engine-test-service";
import { EngineRegistry } from "../engine/engine-registry";
import { IdTaggedEngineConnector, stubEngineRegistry } from "../engine/engine-registry.test-helper";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { ScoringService } from "../scoring/scoring-service";
import { ProxyScoringPipeline, RuleScoringPipeline } from "../scoring/scoring-pipeline";
import { BASELINE_METRICS, type BaselineMetric } from "../metrics/metric-types";
import { DiagnosticBatchController } from "./diagnostic-batch.controller";
import { DiagnosticBatchService } from "./diagnostic-batch-service";
import { AlertService } from "../alert/alert.service";
import { DiagnosticService } from "./diagnostic-service";
import {
  DiagnosticRunRepository,
  type DiagnosticRunDetail,
  type DiagnosticRunSummary,
  type PersistDiagnosticRunInput,
  type PersistDiagnosticRunResult,
} from "./diagnostic-run-types";
import { runCredibility } from "./diagnostic-credibility.test-helper";
import { JobController } from "../worker/job.controller";
import { JobRunnerService } from "../worker/job-runner.service";
import { EngineTestRunService } from "../engine/engine-test-run.service";
import { JobQueueService } from "../worker/job-queue.service";
import { stubJobQueueService } from "../worker/job-queue.test-helper";
import { JobRepository, InMemoryJobRepository } from "../worker/job.repository";
import { JobService } from "../worker/job.service";
import { ContentDraftService } from "../content/content-draft.service";
import { DistributionService } from "../distribution/distribution.service";

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
class InMemoryBrandEntityRepository extends BrandEntityRepository {
  async listAssertions(): Promise<Assertion[]> {
    return [];
  }
  async createAssertion(): Promise<Assertion> {
    throw new Error("not used");
  }
  async deleteAssertion(): Promise<boolean> {
    return false;
  }
  async listCompetitors(): Promise<Competitor[]> {
    return [];
  }
  async createCompetitor(): Promise<Competitor> {
    throw new Error("not used");
  }
  async deleteCompetitor(): Promise<boolean> {
    return false;
  }
}

class InMemoryDiagnosticRunRepository extends DiagnosticRunRepository {
  private readonly runs = new Map<string, DiagnosticRunDetail>();
  private seq = 0;

  async persistFullRun(input: PersistDiagnosticRunInput): Promise<PersistDiagnosticRunResult> {
    const runId = `run_${++this.seq}`;
    const capturedAt = input.capturedAt.toISOString();
    const items = input.items.map((item) => {
      const questionId = `q_${++this.seq}`;
      const engineTestId = `et_${++this.seq}`;
      const scoreId = `sc_${++this.seq}`;
      return {
        question: {
          id: questionId,
          brandId: input.brandId,
          diagnosticRunId: runId,
          category: item.question.category,
          text: item.question.text,
        },
        engineTest: {
          id: engineTestId,
          questionId,
          engineId: item.engineTest.engineId,
          answer: item.engineTest.answer,
          sources: item.engineTest.sources,
          runAt: item.engineTest.runAt,
        },
        score: { id: scoreId, engineTestId, ...item.engineTest.score },
      };
    });

    const detail: DiagnosticRunDetail = {
      id: runId,
      brandId: input.brandId,
      questionCount: input.baseline.questionCount,
      capturedAt,
      metrics: {
        mention_rate: input.baseline.mentionRate,
        positive_rate: input.baseline.positiveRate,
        avg_accuracy: input.baseline.avgAccuracy,
      },
      baseline: input.baseline,
      items,
      credibility: runCredibility(
        items.map((i) => ({
          engineTest: i.engineTest,
          score: { sourcesCount: i.score.sourcesCount },
        })),
        input.scoringMode,
      ),
    };
    this.runs.set(runId, detail);

    const snapshots = BASELINE_METRICS.map((metric) => ({
      id: `snap_${++this.seq}`,
      brandId: input.brandId,
      diagnosticRunId: runId,
      metric,
      value: input.baseline[metricKey(metric)],
      capturedAt,
    }));

    return { diagnosticRunId: runId, snapshots };
  }

  async listByBrand(brandId: string): Promise<DiagnosticRunSummary[]> {
    return [...this.runs.values()]
      .filter((r) => r.brandId === brandId)
      .map(({ items: _i, baseline: _b, ...summary }) => summary);
  }

  async getById(brandId: string, runId: string): Promise<DiagnosticRunDetail | null> {
    const run = this.runs.get(runId);
    return run && run.brandId === brandId ? run : null;
  }
}

function metricKey(metric: BaselineMetric): "mentionRate" | "positiveRate" | "avgAccuracy" {
  switch (metric) {
    case "mention_rate":
      return "mentionRate";
    case "positive_rate":
      return "positiveRate";
    case "avg_accuracy":
      return "avgAccuracy";
  }
}

describe("Diagnostic Batch API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let jobRunner: JobRunnerService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DiagnosticBatchController, JobController],
      providers: [
        BrandService,
        BrandEntityService,
        DiagnosticService,
        DiagnosticBatchService,
        EngineTestService,
        ScoringService,
        ScoringAiFacade,
        RuleScoringPipeline,
        ProxyScoringPipeline,
        JobService,
        JobRunnerService,
        { provide: JobQueueService, useValue: stubJobQueueService() },
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
        {
          provide: EngineRegistry,
          useFactory: () =>
            stubEngineRegistry(
              {
                "openai-proxy": new IdTaggedEngineConnector("openai-proxy"),
                perplexity: new IdTaggedEngineConnector("perplexity"),
              },
              { batchEngineIds: ["openai-proxy", "perplexity"] },
            ),
        },
        { provide: DiagnosticRunRepository, useClass: InMemoryDiagnosticRunRepository },
        { provide: AlertService, useValue: { evaluateAfterRun: async () => [] } },
        { provide: JobRepository, useClass: InMemoryJobRepository },
        { provide: ContentDraftService, useValue: { generateDraft: async () => ({}) } },
        { provide: DistributionService, useValue: { executeTask: async () => ({}) } },
        { provide: EngineTestRunService, useValue: { runForBrand: async () => ({}) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
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

  it("POST /brands/:id/diagnostic-runs -> 202 jobId; worker completes with baseline", async () => {
    const res = await request(app.getHttpServer()).post(`/brands/${brandId}/diagnostic-runs`);
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe("pending");

    await jobRunner.runJob(res.body.jobId);

    const jobRes = await request(app.getHttpServer()).get(`/jobs/${res.body.jobId}`);
    expect(jobRes.status).toBe(200);
    expect(jobRes.body.status).toBe("completed");
    const batch = jobRes.body.result;
    expect(batch.brandId).toBe(brandId);
    expect(batch.diagnosticRunId).toBeTruthy();
    expect(batch.items.length).toBeGreaterThan(0);
    expect(batch.baseline.questionCount).toBeGreaterThan(0);
    expect(batch.items.length).toBe(batch.baseline.questionCount * 2);
  });

  it("POST with engineIds[] runs only selected engines", async () => {
    const res = await request(app.getHttpServer())
      .post(`/brands/${brandId}/diagnostic-runs`)
      .send({ engineIds: ["openai-proxy"] });
    expect(res.status).toBe(202);

    await jobRunner.runJob(res.body.jobId);

    const jobRes = await request(app.getHttpServer()).get(`/jobs/${res.body.jobId}`);
    expect(jobRes.status).toBe(200);
    const batch = jobRes.body.result;
    expect(batch.items.every((i: { engineTest: { engineId: string } }) => i.engineTest.engineId === "openai-proxy")).toBe(
      true,
    );
    expect(batch.items.length).toBe(batch.baseline.questionCount);
  });

  it("POST for unknown brand -> 404", async () => {
    const res = await request(app.getHttpServer()).post("/brands/unknown/diagnostic-runs");
    expect(res.status).toBe(404);
  });
});
