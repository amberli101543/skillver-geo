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
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "../engine/engine-connector";
import { EngineTestService } from "../engine/engine-test-service";
import { EngineRegistry } from "../engine/engine-registry";
import { stubEngineRegistry } from "../engine/engine-registry.test-helper";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { ScoringService } from "../scoring/scoring-service";
import { ProxyScoringPipeline, RuleScoringPipeline } from "../scoring/scoring-pipeline";
import { BASELINE_METRICS, type BaselineMetric } from "../metrics/metric-types";
import { DiagnosticBatchController } from "./diagnostic-batch.controller";
import { DiagnosticBatchService } from "./diagnostic-batch-service";
import { AlertService } from "../alert/alert.service";
import { DiagnosticRunController } from "./diagnostic-run.controller";
import { DiagnosticRunService } from "./diagnostic-run.service";
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

class FakeEngineConnector extends EngineConnector {
  async run(question: string): Promise<EngineAnswer> {
    return stubEngineAnswer(question);
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
        score: {
          id: scoreId,
          engineTestId,
          ...item.engineTest.score,
        },
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
      .map(({ items: _items, baseline: _baseline, ...summary }) => summary)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }

  async getById(brandId: string, runId: string): Promise<DiagnosticRunDetail | null> {
    const run = this.runs.get(runId);
    if (!run || run.brandId !== brandId) {
      return null;
    }
    return run;
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

describe("Diagnostic Run API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let runId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DiagnosticBatchController, DiagnosticRunController, JobController],
      providers: [
        BrandService,
        BrandEntityService,
        DiagnosticService,
        DiagnosticBatchService,
        DiagnosticRunService,
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
              { "openai-proxy": new FakeEngineConnector() },
              { batchEngineIds: ["openai-proxy"] },
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

    const brands = moduleRef.get(BrandService);
    const brand = await brands.create({
      name: "Acme",
      definition: "项目管理 SaaS",
    });
    brandId = brand.id;

    const batchRes = await request(app.getHttpServer()).post(`/brands/${brandId}/diagnostic-runs`);
    expect(batchRes.status).toBe(202);
    const jobRunner = moduleRef.get(JobRunnerService);
    await jobRunner.runJob(batchRes.body.jobId);
    const jobRes = await request(app.getHttpServer()).get(`/jobs/${batchRes.body.jobId}`);
    runId = jobRes.body.result.diagnosticRunId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /brands/:id/diagnostic-runs -> 200 lists runs", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/diagnostic-runs`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toMatchObject({
      id: runId,
      brandId,
      questionCount: expect.any(Number),
      capturedAt: expect.any(String),
      credibility: {
        level: expect.stringMatching(/^(business-ready|partial|demo)$/),
        label: expect.any(String),
        reasons: expect.any(Array),
      },
    });
  });

  it("GET /brands/:id/diagnostic-runs/:runId -> 200 with items and scores", async () => {
    const res = await request(app.getHttpServer()).get(
      `/brands/${brandId}/diagnostic-runs/${runId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(runId);
    expect(res.body.credibility.level).toMatch(/^(business-ready|partial|demo)$/);
    const withAdvice = res.body.items.filter((i: { scoreAdvice?: unknown }) => i.scoreAdvice);
    expect(withAdvice.length).toBeGreaterThan(0);
    expect(withAdvice[0].scoreAdvice.actions.length).toBeGreaterThan(0);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toMatchObject({
      question: { category: expect.any(String), text: expect.any(String) },
      engineTest: { engineId: expect.any(String), answer: expect.any(String) },
      score: {
        mentioned: expect.any(Boolean),
        sentiment: expect.stringMatching(/^(positive|neutral|negative)$/),
        accuracy: expect.any(Number),
      },
    });
  });

  it("GET unknown run -> 404", async () => {
    const res = await request(app.getHttpServer()).get(
      `/brands/${brandId}/diagnostic-runs/unknown-run`,
    );
    expect(res.status).toBe(404);
  });
});
