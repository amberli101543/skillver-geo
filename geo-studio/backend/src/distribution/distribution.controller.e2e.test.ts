import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "../brand/brand.controller";
import { BrandRepository } from "../brand/brand-repository";
import { BrandService } from "../brand/brand-service";
import { type Brand, type BrandInput } from "../brand/brand";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { BrandEntityService } from "../brand/brand-entity.service";
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import { MatrixCellRepository } from "../matrix/matrix-cell.repository";
import { MatrixCellService } from "../matrix/matrix-cell.service";
import { type MatrixCell, type MatrixCellInput, type MatrixCellUpdate } from "../matrix/matrix-cell";
import { ContentDraftRepository } from "../content/content-draft.repository";
import { ContentDraftService } from "../content/content-draft.service";
import { ContentGenerator, stubContentDraft } from "../content/content-generator";
import { type ContentDraft, type ContentDraftUpdate } from "../content/content-draft";
import { DistributionController } from "./distribution.controller";
import { DistributionRepository } from "./distribution.repository";
import { DistributionService } from "./distribution.service";
import { SourceController } from "./source.controller";
import { SourceRepository } from "./source.repository";
import { SourceService } from "./source.service";
import { type Source, type SourceInput, type SourceUpdate } from "./source";
import {
  type DistributionTask,
  type DistributionTaskInput,
  type DistributionTaskUpdate,
} from "./distribution-task";
import { type PublishRecord, type PublishRecordInput } from "./publish-record";
import { PublishConnector } from "./publish-connector";
import {
  CmsApiPublishConnector,
  ExportPublishConnector,
  PublishRegistry,
  RegisteredPublishConnector,
} from "./publish-registry";
import { JobController } from "../worker/job.controller";
import { JobRunnerService } from "../worker/job-runner.service";
import { EngineTestRunService } from "../engine/engine-test-run.service";
import { JobQueueService } from "../worker/job-queue.service";
import { stubJobQueueService } from "../worker/job-queue.test-helper";
import { JobRepository, InMemoryJobRepository } from "../worker/job.repository";
import { JobService } from "../worker/job.service";
import { DiagnosticBatchService } from "../diagnostics/diagnostic-batch-service";
import { MetricSnapshotRepository, type MetricSnapshotRecord } from "../metrics/metric-types";

class InMemoryMetricSnapshotRepository extends MetricSnapshotRepository {
  private readonly rows: MetricSnapshotRecord[] = [];

  seed(rows: MetricSnapshotRecord[]) {
    this.rows.push(...rows);
  }

  async persistBaseline(): Promise<MetricSnapshotRecord[]> {
    return [];
  }

  async listByBrand(brandId: string): Promise<MetricSnapshotRecord[]> {
    return this.rows.filter((r) => r.brandId === brandId);
  }
}

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
  async delete(): Promise<boolean> {
    return false;
  }
  async upsertByIntentAngle(brandId: string, input: Omit<MatrixCellInput, "brandId">): Promise<MatrixCell> {
    return this.create(brandId, input);
  }
}

class InMemoryContentDraftRepository extends ContentDraftRepository {
  private readonly rows: ContentDraft[] = [];
  private readonly cellBrand = new Map<string, string>();
  private seq = 0;
  async listByCell(cellId: string): Promise<ContentDraft[]> {
    return this.rows.filter((r) => r.cellId === cellId);
  }
  async listByBrand(brandId: string): Promise<ContentDraft[]> {
    return this.rows.filter((r) => this.cellBrand.get(r.cellId) === brandId);
  }
  async findById(brandId: string, draftId: string): Promise<ContentDraft | null> {
    const row = this.rows.find((r) => r.id === draftId);
    if (!row || this.cellBrand.get(row.cellId) !== brandId) return null;
    return row;
  }
  registerCellBrand(cellId: string, brandId: string): void {
    this.cellBrand.set(cellId, brandId);
  }
  async createNextVersion(cellId: string, body: string): Promise<ContentDraft> {
    const now = new Date().toISOString();
    const row: ContentDraft = {
      id: `draft_${++this.seq}`,
      cellId,
      body,
      status: "draft",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return row;
  }
  async update(brandId: string, draftId: string, input: ContentDraftUpdate): Promise<ContentDraft | null> {
    const row = await this.findById(brandId, draftId);
    if (!row) return null;
    const idx = this.rows.findIndex((r) => r.id === draftId);
    this.rows[idx] = { ...this.rows[idx]!, ...input, updatedAt: new Date().toISOString() };
    return this.rows[idx]!;
  }
  async saveVerification(
    brandId: string,
    draftId: string,
    verification: import("../content/content-draft").ContentVerification,
  ): Promise<ContentDraft | null> {
    const row = await this.findById(brandId, draftId);
    if (!row) return null;
    const idx = this.rows.findIndex((r) => r.id === draftId);
    this.rows[idx] = {
      ...this.rows[idx]!,
      verification,
      updatedAt: new Date().toISOString(),
    };
    return this.rows[idx]!;
  }
  async delete(): Promise<boolean> {
    return false;
  }
}

class StubContentGenerator extends ContentGenerator {
  async generate(ctx: Parameters<typeof stubContentDraft>[0]) {
    return { body: stubContentDraft(ctx), ragSnippets: [] };
  }
}

class InMemorySourceRepository extends SourceRepository {
  private readonly rows: Source[] = [];
  private seq = 0;
  async list(): Promise<Source[]> {
    return [...this.rows];
  }
  async findById(id: string): Promise<Source | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async findByName(name: string): Promise<Source | null> {
    return this.rows.find((r) => r.name === name) ?? null;
  }
  async create(input: SourceInput): Promise<Source> {
    const row: Source = { id: `src_${++this.seq}`, ...input };
    this.rows.push(row);
    return row;
  }
  async update(id: string, input: SourceUpdate): Promise<Source | null> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    this.rows[idx] = { ...this.rows[idx]!, ...input };
    return this.rows[idx]!;
  }
  async delete(id: string): Promise<boolean> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    this.rows.splice(idx, 1);
    return true;
  }
}

class InMemoryDistributionRepository extends DistributionRepository {
  private readonly tasks: DistributionTask[] = [];
  private readonly records: PublishRecord[] = [];
  private taskSeq = 0;
  private recordSeq = 0;
  async listTasks(brandId: string): Promise<DistributionTask[]> {
    return this.tasks.filter((t) => t.brandId === brandId);
  }
  async findTask(brandId: string, taskId: string): Promise<DistributionTask | null> {
    return this.tasks.find((t) => t.brandId === brandId && t.id === taskId) ?? null;
  }
  async createTask(brandId: string, input: DistributionTaskInput): Promise<DistributionTask> {
    if (this.tasks.some((t) => t.contentDraftId === input.contentDraftId && t.sourceId === input.sourceId)) {
      const err = new Error("unique") as Error & { code: string };
      err.code = "P2002";
      throw err;
    }
    const now = new Date().toISOString();
    const row: DistributionTask = {
      id: `task_${++this.taskSeq}`,
      brandId,
      ...input,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.push(row);
    return row;
  }
  async updateTask(brandId: string, taskId: string, input: DistributionTaskUpdate): Promise<DistributionTask | null> {
    const idx = this.tasks.findIndex((t) => t.brandId === brandId && t.id === taskId);
    if (idx < 0) return null;
    this.tasks[idx] = { ...this.tasks[idx]!, ...input, updatedAt: new Date().toISOString() };
    return this.tasks[idx]!;
  }
  async deleteTask(brandId: string, taskId: string): Promise<boolean> {
    const idx = this.tasks.findIndex((t) => t.brandId === brandId && t.id === taskId);
    if (idx < 0) return false;
    this.tasks.splice(idx, 1);
    return true;
  }
  async listPublishRecords(brandId: string): Promise<PublishRecord[]> {
    return this.records.filter((r) => r.brandId === brandId);
  }
  async createPublishRecord(
    brandId: string,
    input: {
      contentDraftId: string;
      sourceId?: string;
      distributionTaskId?: string;
      channel: string;
      externalUrl?: string;
      publishedAt: Date;
    },
  ): Promise<PublishRecord> {
    const row: PublishRecord = {
      id: `pub_${++this.recordSeq}`,
      brandId,
      contentDraftId: input.contentDraftId,
      channel: input.channel,
      publishedAt: input.publishedAt.toISOString(),
      createdAt: new Date().toISOString(),
      ...(input.sourceId ? { sourceId: input.sourceId } : {}),
      ...(input.distributionTaskId ? { distributionTaskId: input.distributionTaskId } : {}),
      ...(input.externalUrl ? { externalUrl: input.externalUrl } : {}),
    };
    this.records.push(row);
    return row;
  }
}

describe("Distribution API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let draftId: string;
  let sourceId: string;
  let draftRepo: InMemoryContentDraftRepository;
  let jobRunner: JobRunnerService;

  beforeAll(async () => {
    draftRepo = new InMemoryContentDraftRepository();
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController, SourceController, DistributionController, JobController],
      providers: [
        BrandService,
        BrandEntityService,
        MatrixCellService,
        ContentDraftService,
        SourceService,
        DistributionService,
        JobService,
        JobRunnerService,
        { provide: JobQueueService, useValue: stubJobQueueService() },
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
        { provide: MatrixCellRepository, useClass: InMemoryMatrixCellRepository },
        { provide: ContentDraftRepository, useValue: draftRepo },
        { provide: ContentGenerator, useClass: StubContentGenerator },
        { provide: SourceRepository, useClass: InMemorySourceRepository },
        { provide: DistributionRepository, useClass: InMemoryDistributionRepository },
        { provide: MetricSnapshotRepository, useClass: InMemoryMetricSnapshotRepository },
        ExportPublishConnector,
        CmsApiPublishConnector,
        PublishRegistry,
        { provide: PublishConnector, useClass: RegisteredPublishConnector },
        { provide: JobRepository, useClass: InMemoryJobRepository },
        { provide: DiagnosticBatchService, useValue: { runAndPersist: async () => ({}) } },
        { provide: EngineTestRunService, useValue: { runForBrand: async () => ({}) } },
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

    const matrixCells = moduleRef.get(MatrixCellService);
    const cell = await matrixCells.createCell(brandId, {
      intent: "品牌了解",
      angle: "核心价值",
      title: "叙事",
      priority: 10,
    });
    draftRepo.registerCellBrand(cell.id, brandId);
    const drafts = moduleRef.get(ContentDraftService);
    const draft = await drafts.generateDraft(brandId, cell.id);
    draftId = draft.id;

    const sourceRes = await request(app.getHttpServer()).post("/sources").send({
      name: "官网博客",
      tier: "owned",
      weight: 90,
      channelType: "api",
    });
    sourceId = sourceRes.body.id;

    const metricsRepo = moduleRef.get(MetricSnapshotRepository) as InMemoryMetricSnapshotRepository;
    metricsRepo.seed([
      {
        id: "snap1",
        brandId,
        diagnosticRunId: "run_before",
        metric: "mention_rate",
        value: 0.25,
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "snap2",
        brandId,
        diagnosticRunId: "run_before",
        metric: "positive_rate",
        value: 0.3,
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "snap3",
        brandId,
        diagnosticRunId: "run_before",
        metric: "avg_accuracy",
        value: 0.4,
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "snap4",
        brandId,
        diagnosticRunId: "run_after",
        metric: "mention_rate",
        value: 0.5,
        capturedAt: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "snap5",
        brandId,
        diagnosticRunId: "run_after",
        metric: "positive_rate",
        value: 0.45,
        capturedAt: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "snap6",
        brandId,
        diagnosticRunId: "run_after",
        metric: "avg_accuracy",
        value: 0.55,
        capturedAt: "2026-06-20T00:00:00.000Z",
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /sources -> 201", async () => {
    const res = await request(app.getHttpServer()).post("/sources").send({
      name: "知乎专栏",
      tier: "community",
      weight: 60,
      channelType: "manual",
    });
    expect(res.status).toBe(201);
  });

  it("POST /distribution-tasks -> 201", async () => {
    const res = await request(app.getHttpServer())
      .post(`/brands/${brandId}/distribution-tasks`)
      .send({ contentDraftId: draftId, sourceId, priority: 70 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
  });

  it("POST /publish-records -> 201 and completes task", async () => {
    const tasks = await request(app.getHttpServer()).get(`/brands/${brandId}/distribution-tasks`);
    const taskId = tasks.body[0].id as string;
    const res = await request(app.getHttpServer())
      .post(`/brands/${brandId}/publish-records`)
      .send({
        contentDraftId: draftId,
        sourceId,
        distributionTaskId: taskId,
        channel: "官网 CMS",
        externalUrl: "https://example.com/a",
      });
    expect(res.status).toBe(201);
    const updated = await request(app.getHttpServer()).get(`/brands/${brandId}/distribution-tasks`);
    expect(updated.body[0].status).toBe("completed");
  });

  it("POST /distribution-tasks/:taskId/execute -> api publish", async () => {
    const apiSource = await request(app.getHttpServer()).post("/sources").send({
      name: "CMS 自动发布",
      tier: "owned",
      weight: 95,
      channelType: "api",
    });
    const freshTask = await request(app.getHttpServer())
      .post(`/brands/${brandId}/distribution-tasks`)
      .send({ contentDraftId: draftId, sourceId: apiSource.body.id, priority: 80 });
    expect(freshTask.status).toBe(201);
    const taskId = freshTask.body.id as string;
    const res = await request(app.getHttpServer()).post(
      `/brands/${brandId}/distribution-tasks/${taskId}/execute`,
    );
    expect(res.status).toBe(202);
    await jobRunner.runJob(res.body.jobId);
    const jobRes = await request(app.getHttpServer()).get(`/jobs/${res.body.jobId}`);
    expect(jobRes.body.status).toBe("completed");
    expect(jobRes.body.result.mode).toBe("api");
    expect(jobRes.body.result.publishRecord.externalUrl).toContain("stub.cms");
    expect(jobRes.body.result.task.status).toBe("completed");
  });

  it("POST /distribution-tasks/:taskId/execute -> export manuscript", async () => {
    const exportSource = await request(app.getHttpServer()).post("/sources").send({
      name: "导出测试",
      tier: "community",
      weight: 50,
      channelType: "export",
    });
    const taskRes = await request(app.getHttpServer())
      .post(`/brands/${brandId}/distribution-tasks`)
      .send({ contentDraftId: draftId, sourceId: exportSource.body.id, priority: 40 });
    const execRes = await request(app.getHttpServer()).post(
      `/brands/${brandId}/distribution-tasks/${taskRes.body.id}/execute`,
    );
    expect(execRes.status).toBe(202);
    await jobRunner.runJob(execRes.body.jobId);
    const jobRes = await request(app.getHttpServer()).get(`/jobs/${execRes.body.jobId}`);
    expect(jobRes.body.result.mode).toBe("export");
    expect(jobRes.body.result.export.filename).toContain(".md");
    expect(jobRes.body.result.task.status).toBe("in_progress");
  });

  it("GET /distribution-impact -> 200 with before/after deltas", async () => {
    await request(app.getHttpServer())
      .post(`/brands/${brandId}/publish-records`)
      .send({
        contentDraftId: draftId,
        sourceId,
        channel: "manual",
        publishedAt: "2026-06-12T00:00:00.000Z",
      });
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/distribution-impact`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    // 用 publishedAt 定位目标记录：items[0] 是最新发布，之前用例默认 publishedAt=now，
    // 一旦超过种子跑批时间（2026-06-20）方向会变成 pending，导致测试随日期漂移。
    const item = res.body.items.find(
      (i: { publishedAt: string }) => i.publishedAt === "2026-06-12T00:00:00.000Z",
    );
    expect(item.overallDirection).toBe("improved");
    expect(item.metrics.mention_rate.delta).toBeCloseTo(0.25);
  });
});
