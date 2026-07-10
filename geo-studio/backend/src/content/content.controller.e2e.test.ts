import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "../brand/brand.controller";
import { BrandRepository } from "../brand/brand-repository";
import { BrandService } from "../brand/brand-service";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { BrandEntityService } from "../brand/brand-entity.service";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import { MatrixController } from "../matrix/matrix.controller";
import { MatrixCellRepository } from "../matrix/matrix-cell.repository";
import { MatrixCellService } from "../matrix/matrix-cell.service";
import { MatrixGapService } from "../matrix/matrix-gap.service";
import { MatrixAssertionSyncService } from "../matrix/matrix-assertion-sync.service";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import { DiagnosticRunRepository } from "../diagnostics/diagnostic-run-types";
import { ContentController } from "./content.controller";
import { ContentDraftRepository } from "./content-draft.repository";
import { ContentDraftService } from "./content-draft.service";
import { ContentGenerator, stubContentDraft } from "./content-generator";
import { JobController } from "../worker/job.controller";
import { JobRunnerService } from "../worker/job-runner.service";
import { EngineTestRunService } from "../engine/engine-test-run.service";
import { JobQueueService } from "../worker/job-queue.service";
import { stubJobQueueService } from "../worker/job-queue.test-helper";
import { JobRepository, InMemoryJobRepository } from "../worker/job.repository";
import { JobService } from "../worker/job.service";
import { DiagnosticBatchService } from "../diagnostics/diagnostic-batch-service";
import { DistributionService } from "../distribution/distribution.service";
import { type MatrixCell, type MatrixCellInput, type MatrixCellUpdate } from "../matrix/matrix-cell";
import { type ContentDraft, type ContentDraftUpdate } from "./content-draft";

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

class InMemoryMatrixCellRepository extends MatrixCellRepository {
  private readonly rows: MatrixCell[] = [];
  private seq = 0;
  async listByBrand(brandId: string): Promise<MatrixCell[]> {
    return this.rows.filter((r) => r.brandId === brandId);
  }
  async findById(brandId: string, cellId: string): Promise<MatrixCell | null> {
    return this.rows.find((r) => r.brandId === brandId && r.id === cellId) ?? null;
  }
  async create(brandId: string, input: Omit<MatrixCellInput, "brandId">): Promise<MatrixCell> {
    const row: MatrixCell = { id: `cell_${++this.seq}`, brandId, ...input };
    this.rows.push(row);
    return row;
  }
  async update(brandId: string, cellId: string, input: MatrixCellUpdate): Promise<MatrixCell | null> {
    const idx = this.rows.findIndex((r) => r.brandId === brandId && r.id === cellId);
    if (idx < 0) return null;
    this.rows[idx] = { ...this.rows[idx]!, ...input };
    return this.rows[idx]!;
  }
  async delete(brandId: string, cellId: string): Promise<boolean> {
    const idx = this.rows.findIndex((r) => r.brandId === brandId && r.id === cellId);
    if (idx < 0) return false;
    this.rows.splice(idx, 1);
    return true;
  }
  async upsertByIntentAngle(brandId: string, input: Omit<MatrixCellInput, "brandId">): Promise<MatrixCell> {
    return this.create(brandId, input);
  }
}

class InMemoryContentDraftRepository extends ContentDraftRepository {
  private readonly rows: ContentDraft[] = [];
  private seq = 0;
  async listByCell(cellId: string): Promise<ContentDraft[]> {
    return this.rows.filter((r) => r.cellId === cellId);
  }
  async listByBrand(_brandId: string): Promise<ContentDraft[]> {
    return [...this.rows];
  }
  async findById(_brandId: string, draftId: string): Promise<ContentDraft | null> {
    return this.rows.find((r) => r.id === draftId) ?? null;
  }
  async createNextVersion(cellId: string, body: string): Promise<ContentDraft> {
    const version = this.rows.filter((r) => r.cellId === cellId).reduce((m, r) => Math.max(m, r.version), 0) + 1;
    const now = new Date().toISOString();
    const row: ContentDraft = {
      id: `draft_${++this.seq}`,
      cellId,
      body,
      status: "draft",
      version,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return row;
  }
  async update(_brandId: string, draftId: string, input: ContentDraftUpdate): Promise<ContentDraft | null> {
    const idx = this.rows.findIndex((r) => r.id === draftId);
    if (idx < 0) return null;
    this.rows[idx] = { ...this.rows[idx]!, ...input, updatedAt: new Date().toISOString() };
    return this.rows[idx]!;
  }
  async saveVerification(
    _brandId: string,
    draftId: string,
    verification: import("./content-draft").ContentVerification,
  ): Promise<ContentDraft | null> {
    const idx = this.rows.findIndex((r) => r.id === draftId);
    if (idx < 0) return null;
    this.rows[idx] = {
      ...this.rows[idx]!,
      verification,
      updatedAt: new Date().toISOString(),
    };
    return this.rows[idx]!;
  }
  async delete(_brandId: string, draftId: string): Promise<boolean> {
    const idx = this.rows.findIndex((r) => r.id === draftId);
    if (idx < 0) return false;
    this.rows.splice(idx, 1);
    return true;
  }
}

class StubContentGenerator extends ContentGenerator {
  async generate(ctx: Parameters<typeof stubContentDraft>[0]) {
    return { body: stubContentDraft(ctx), ragSnippets: [] };
  }
}

function stubEngineTestRunService() {
  return {
    runForBrand: async (_brandId: string, question: string) => ({
      question,
      engineId: "proxy-engine-stub",
      answer: `[stub] 针对「${question}」的评估回答`,
      sources: [{ url: "https://stub.geo-studio.local/ref/1", title: "stub" }],
      runAt: new Date().toISOString(),
      score: {
        mentioned: false,
        mentionPosition: null,
        sentiment: "neutral" as const,
        accuracy: 0.2,
        sourcesCount: 1,
      },
    }),
  };
}

describe("Content API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let cellId: string;
  let jobRunner: JobRunnerService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController, MatrixController, ContentController, JobController],
      providers: [
        BrandService,
        BrandEntityService,
        MatrixCellService,
        MatrixGapService,
        DiagnosticRunService,
        ContentDraftService,
        JobService,
        JobRunnerService,
        { provide: JobQueueService, useValue: stubJobQueueService() },
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
        { provide: MatrixCellRepository, useClass: InMemoryMatrixCellRepository },
        { provide: DiagnosticRunRepository, useValue: { listByBrand: async () => [], getById: async () => null, persistFullRun: async () => ({ diagnosticRunId: "r1", snapshots: [] }) } },
        { provide: ContentDraftRepository, useClass: InMemoryContentDraftRepository },
        { provide: ContentGenerator, useClass: StubContentGenerator },
        {
          provide: MatrixAssertionSyncService,
          useValue: { syncFromAssertions: async () => ({ cells: [] }) },
        },
        { provide: JobRepository, useClass: InMemoryJobRepository },
        { provide: DiagnosticBatchService, useValue: { runAndPersist: async () => ({}) } },
        { provide: DistributionService, useValue: { executeTask: async () => ({}) } },
        { provide: EngineTestRunService, useValue: stubEngineTestRunService() },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    jobRunner = moduleRef.get(JobRunnerService);

    const brandRes = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "SaaS" });
    brandId = brandRes.body.id;

    const cellRes = await request(app.getHttpServer())
      .post(`/brands/${brandId}/matrix-cells`)
      .send({ intent: "品牌了解", angle: "核心价值", title: "叙事", priority: 40 });
    expect(cellRes.status).toBe(201);
    cellId = cellRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST generate -> 202 job; worker creates draft", async () => {
    const res = await request(app.getHttpServer()).post(
      `/brands/${brandId}/matrix-cells/${cellId}/content-drafts/generate`,
    );
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeTruthy();
    await jobRunner.runJob(res.body.jobId);
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/content-drafts`);
    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body[0].body).toContain("Acme");
    expect(list.body[0].version).toBe(1);
    expect(list.body[0].verification).toMatchObject({
      direction: "needs_improvement",
      question: expect.stringContaining("Acme"),
      hints: expect.any(Array),
    });
  });

  it("POST verify -> 200 with verification", async () => {
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/content-drafts`);
    const draftId = list.body[0].id as string;
    const res = await request(app.getHttpServer()).post(
      `/brands/${brandId}/content-drafts/${draftId}/verify`,
    );
    expect(res.status).toBe(200);
    expect(res.body.verification.direction).toBe("needs_improvement");
  });

  it("GET content-drafts -> 200", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/content-drafts`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("PATCH content-drafts/:id -> 200", async () => {
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/content-drafts`);
    const draftId = list.body[0].id as string;
    const res = await request(app.getHttpServer())
      .patch(`/brands/${brandId}/content-drafts/${draftId}`)
      .send({ status: "review" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("review");
  });
});
