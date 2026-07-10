import { beforeEach, describe, expect, it } from "vitest";
import { BrandService } from "../brand/brand-service";
import { BrandRepository } from "../brand/brand-repository";
import { type Brand, type BrandInput } from "../brand/brand";
import { ContentDraftService } from "../content/content-draft.service";
import { ContentDraftRepository } from "../content/content-draft.repository";
import { ContentGenerator, stubContentDraft } from "../content/content-generator";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import { MatrixCellService } from "../matrix/matrix-cell.service";
import { MatrixCellRepository } from "../matrix/matrix-cell.repository";
import { type MatrixCell, type MatrixCellInput, type MatrixCellUpdate } from "../matrix/matrix-cell";
import { type ContentDraft, type ContentDraftUpdate } from "../content/content-draft";
import { DistributionService } from "./distribution.service";
import { DistributionRepository } from "./distribution.repository";
import { SourceService } from "./source.service";
import { SourceRepository } from "./source.repository";
import { PublishConnector, stubApiPublish, buildExportManuscript } from "./publish-connector";
import { type Source, type SourceInput, type SourceUpdate } from "./source";
import {
  type DistributionTask,
  type DistributionTaskInput,
  type DistributionTaskUpdate,
} from "./distribution-task";
import { type PublishRecord, type PublishRecordInput } from "./publish-record";
import { MetricSnapshotRepository, type MetricSnapshotRecord } from "../metrics/metric-types";
import { EngineTestRunService } from "../engine/engine-test-run.service";

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
  async update(): Promise<MatrixCell | null> {
    return null;
  }
  async delete(): Promise<boolean> {
    return false;
  }
  async upsertByIntentAngle(): Promise<MatrixCell> {
    throw new Error("not used");
  }
}

class InMemoryContentDraftRepository extends ContentDraftRepository {
  private readonly rows: ContentDraft[] = [];
  private seq = 0;
  async listByCell(): Promise<ContentDraft[]> {
    return [];
  }
  async listByBrand(brandId: string): Promise<ContentDraft[]> {
    void brandId;
    return [...this.rows];
  }
  async findById(brandId: string, draftId: string): Promise<ContentDraft | null> {
    const row = this.rows.find((r) => r.id === draftId);
    return row ?? null;
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
  async update(_brandId: string, draftId: string, input: ContentDraftUpdate): Promise<ContentDraft | null> {
    const idx = this.rows.findIndex((r) => r.id === draftId);
    if (idx < 0) return null;
    this.rows[idx] = { ...this.rows[idx]!, ...input, updatedAt: new Date().toISOString() };
    return this.rows[idx]!;
  }
  async saveVerification(
    _brandId: string,
    draftId: string,
    verification: import("../content/content-draft").ContentVerification,
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
  async delete(): Promise<boolean> {
    return false;
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
    const now = new Date().toISOString();
    const existing = this.tasks.find(
      (t) => t.contentDraftId === input.contentDraftId && t.sourceId === input.sourceId,
    );
    if (existing) {
      const err = new Error("unique") as Error & { code: string };
      err.code = "P2002";
      throw err;
    }
    const row: DistributionTask = {
      id: `task_${++this.taskSeq}`,
      brandId,
      contentDraftId: input.contentDraftId,
      sourceId: input.sourceId,
      priority: input.priority,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.push(row);
    return row;
  }

  async updateTask(
    brandId: string,
    taskId: string,
    input: DistributionTaskUpdate,
  ): Promise<DistributionTask | null> {
    const idx = this.tasks.findIndex((t) => t.brandId === brandId && t.id === taskId);
    if (idx < 0) return null;
    this.tasks[idx] = {
      ...this.tasks[idx]!,
      ...input,
      updatedAt: new Date().toISOString(),
    };
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

class InMemoryMetricSnapshotRepository extends MetricSnapshotRepository {
  private readonly rows: MetricSnapshotRecord[] = [];

  setRows(rows: MetricSnapshotRecord[]) {
    this.rows.length = 0;
    this.rows.push(...rows);
  }

  async persistBaseline(): Promise<MetricSnapshotRecord[]> {
    return [];
  }

  async listByBrand(brandId: string): Promise<MetricSnapshotRecord[]> {
    return this.rows.filter((r) => r.brandId === brandId);
  }
}

class StubPublishConnector extends PublishConnector {
  async publish(ctx: Parameters<typeof buildExportManuscript>[0]) {
    if (ctx.source.channelType === "export" || ctx.source.channelType === "manual") {
      return {
        mode: "export" as const,
        channel: ctx.source.name,
        export: buildExportManuscript(ctx),
      };
    }
    return stubApiPublish(ctx);
  }
}

describe("DistributionService", () => {
  let service: DistributionService;
  let sources: SourceService;
  let metricsRepo: InMemoryMetricSnapshotRepository;
  let brandId: string;
  let draftId: string;
  let sourceId: string;

  beforeEach(async () => {
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    const cells = new MatrixCellService(brands, new InMemoryMatrixCellRepository());
    metricsRepo = new InMemoryMetricSnapshotRepository();
    const drafts = new ContentDraftService(
      brands,
      entities,
      cells,
      new InMemoryContentDraftRepository(),
      new StubContentGenerator(),
      { runForBrand: async (_brandId: string, question: string) => ({
        question,
        engineId: "stub",
        answer: `[stub] ${question}`,
        sources: [],
        runAt: new Date().toISOString(),
        score: {
          mentioned: false,
          mentionPosition: null,
          sentiment: "neutral" as const,
          accuracy: 0.2,
          sourcesCount: 0,
        },
      }) } as unknown as EngineTestRunService,
    );
    sources = new SourceService(new InMemorySourceRepository());
    service = new DistributionService(
      brands,
      drafts,
      cells,
      sources,
      new InMemoryDistributionRepository(),
      new StubPublishConnector(),
      metricsRepo,
    );

    const brand = await brands.create({ name: "Acme", definition: "SaaS" });
    brandId = brand.id;
    const cell = await cells.createCell(brandId, {
      intent: "品牌了解",
      angle: "核心价值",
      title: "叙事",
      priority: 10,
    });
    const draft = await drafts.generateDraft(brandId, cell.id);
    draftId = draft.id;
    const source = await sources.create({
      name: "官网",
      tier: "owned",
      weight: 90,
      channelType: "api",
    });
    sourceId = source.id;
  });

  it("creates distribution task", async () => {
    const task = await service.createTask(brandId, {
      contentDraftId: draftId,
      sourceId,
      priority: 50,
    });
    expect(task.status).toBe("pending");
    expect((await service.listTasks(brandId)).length).toBe(1);
  });

  it("records publish and completes matching task", async () => {
    const task = await service.createTask(brandId, {
      contentDraftId: draftId,
      sourceId,
      priority: 50,
    });
    const record = await service.recordPublish(brandId, {
      contentDraftId: draftId,
      sourceId,
      distributionTaskId: task.id,
      channel: "官网 CMS",
      externalUrl: "https://example.com/post/1",
    });
    expect(record.channel).toBe("官网 CMS");
    const tasks = await service.listTasks(brandId);
    expect(tasks[0]?.status).toBe("completed");
  });

  it("executes api task and records publish", async () => {
    const task = await service.createTask(brandId, {
      contentDraftId: draftId,
      sourceId,
      priority: 50,
    });
    const result = await service.executeTask(brandId, task.id);
    expect(result.mode).toBe("api");
    expect(result.publishRecord?.externalUrl).toContain("stub.cms");
    expect(result.task.status).toBe("completed");
  });

  it("executes export task and returns manuscript", async () => {
    const exportSource = await sources.create({
      name: "导出渠道",
      tier: "community",
      weight: 40,
      channelType: "export",
    });
    const task = await service.createTask(brandId, {
      contentDraftId: draftId,
      sourceId: exportSource.id,
      priority: 30,
    });
    const result = await service.executeTask(brandId, task.id);
    expect(result.mode).toBe("export");
    expect(result.export?.body).toContain("Acme");
    expect(result.task.status).toBe("in_progress");
  });

  it("returns distribution impact for publish records", async () => {
    metricsRepo.setRows([
      {
        id: "s1",
        brandId,
        diagnosticRunId: "r1",
        metric: "mention_rate",
        value: 0.3,
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "s2",
        brandId,
        diagnosticRunId: "r1",
        metric: "positive_rate",
        value: 0.4,
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "s3",
        brandId,
        diagnosticRunId: "r1",
        metric: "avg_accuracy",
        value: 0.5,
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "s4",
        brandId,
        diagnosticRunId: "r2",
        metric: "mention_rate",
        value: 0.55,
        capturedAt: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "s5",
        brandId,
        diagnosticRunId: "r2",
        metric: "positive_rate",
        value: 0.5,
        capturedAt: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "s6",
        brandId,
        diagnosticRunId: "r2",
        metric: "avg_accuracy",
        value: 0.65,
        capturedAt: "2026-06-20T00:00:00.000Z",
      },
    ]);
    await service.recordPublish(brandId, {
      contentDraftId: draftId,
      channel: "manual",
      publishedAt: "2026-06-12T00:00:00.000Z",
    });
    const impact = await service.getDistributionImpact(brandId);
    expect(impact.items).toHaveLength(1);
    expect(impact.items[0]?.overallDirection).toBe("improved");
  });
});
