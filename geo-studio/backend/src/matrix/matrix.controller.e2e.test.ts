import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "../brand/brand.controller";
import { BrandRepository } from "../brand/brand-repository";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { BrandService } from "../brand/brand-service";
import { BrandEntityService } from "../brand/brand-entity.service";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import {
  DiagnosticRunRepository,
  type DiagnosticRunDetail,
  type DiagnosticRunSummary,
  type PersistDiagnosticRunInput,
  type PersistDiagnosticRunResult,
} from "../diagnostics/diagnostic-run-types";
import { runCredibility } from "../diagnostics/diagnostic-credibility.test-helper";
import { MatrixController } from "./matrix.controller";
import { MatrixCellRepository } from "./matrix-cell.repository";
import { MatrixCellService } from "./matrix-cell.service";
import { MatrixGapService } from "./matrix-gap.service";
import { MatrixAssertionSyncService } from "./matrix-assertion-sync.service";
import { matrixCellKey, type MatrixCell, type MatrixCellInput, type MatrixCellUpdate } from "./matrix-cell";

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

  async upsertByIntentAngle(
    brandId: string,
    input: Omit<MatrixCellInput, "brandId">,
  ): Promise<MatrixCell> {
    const idx = this.rows.findIndex(
      (r) => r.brandId === brandId && matrixCellKey(r) === matrixCellKey(input),
    );
    if (idx >= 0) {
      this.rows[idx] = { ...this.rows[idx]!, title: input.title, priority: input.priority };
      return this.rows[idx]!;
    }
    return this.create(brandId, input);
  }
}

class InMemoryDiagnosticRunRepository extends DiagnosticRunRepository {
  private readonly runs = new Map<string, DiagnosticRunDetail>();
  private seq = 0;

  async persistFullRun(input: PersistDiagnosticRunInput): Promise<PersistDiagnosticRunResult> {
    const runId = `run_${++this.seq}`;
    const items = input.items.map((item, i) => ({
      question: {
        id: `q_${i}`,
        brandId: input.brandId,
        diagnosticRunId: runId,
        category: item.question.category,
        text: item.question.text,
      },
      engineTest: {
        id: `et_${i}`,
        questionId: `q_${i}`,
        engineId: item.engineTest.engineId,
        answer: item.engineTest.answer,
        sources: item.engineTest.sources,
        runAt: item.engineTest.runAt,
      },
      score: {
        id: `sc_${i}`,
        engineTestId: `et_${i}`,
        ...item.engineTest.score,
      },
    }));
    const detail: DiagnosticRunDetail = {
      id: runId,
      brandId: input.brandId,
      questionCount: input.baseline.questionCount,
      capturedAt: input.capturedAt.toISOString(),
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
    return { diagnosticRunId: runId, snapshots: [] };
  }

  async listByBrand(brandId: string): Promise<DiagnosticRunSummary[]> {
    return [...this.runs.values()]
      .filter((r) => r.brandId === brandId)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .map(({ id, brandId: bid, questionCount, capturedAt, metrics, credibility }) => ({
        id,
        brandId: bid,
        questionCount,
        capturedAt,
        metrics,
        credibility,
      }));
  }

  async getById(brandId: string, runId: string): Promise<DiagnosticRunDetail | null> {
    const run = this.runs.get(runId);
    return run && run.brandId === brandId ? run : null;
  }
}

describe("Matrix API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let runsRepo: InMemoryDiagnosticRunRepository;

  beforeAll(async () => {
    runsRepo = new InMemoryDiagnosticRunRepository();
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController, MatrixController],
      providers: [
        BrandService,
        BrandEntityService,
        DiagnosticRunService,
        MatrixCellService,
        MatrixGapService,
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
        { provide: MatrixCellRepository, useClass: InMemoryMatrixCellRepository },
        { provide: DiagnosticRunRepository, useValue: runsRepo },
        {
          provide: MatrixAssertionSyncService,
          useValue: { syncFromAssertions: async () => ({ cells: [] }) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "SaaS" });
    brandId = res.body.id;

    await runsRepo.persistFullRun({
      brandId,
      capturedAt: new Date("2026-06-12T00:00:00.000Z"),
      baseline: {
        questionCount: 1,
        mentionRate: 0,
        positiveRate: 0,
        avgAccuracy: 0.2,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 1 },
      },
      items: [
        {
          question: { category: "brand", text: "Acme怎么样", brandId },
          engineTest: {
            engineId: "stub",
            answer: "一般",
            sources: [],
            runAt: new Date().toISOString(),
            question: "Acme怎么样",
            score: {
              mentioned: false,
              mentionPosition: null,
              sentiment: "negative" as const,
              accuracy: 0.2,
              sourcesCount: 0,
            },
          },
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /matrix-cells -> 201", async () => {
    const res = await request(app.getHttpServer())
      .post(`/brands/${brandId}/matrix-cells`)
      .send({
        intent: "品类认知",
        angle: "推荐曝光",
        title: "提升品类可见度",
        priority: 50,
      });
    expect(res.status).toBe(201);
    expect(res.body.intent).toBe("品类认知");
    expect(res.body.stage).toBe("全阶段");
    expect(res.body.audience).toBe("通用受众");
  });

  it("GET /matrix-cells -> 200", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/matrix-cells`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /matrix-gaps -> 200 with gaps from latest run", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/matrix-gaps`);
    expect(res.status).toBe(200);
    expect(res.body.gaps.length).toBeGreaterThan(0);
    expect(res.body.gaps[0].intent).toBe("品牌了解");
  });

  it("POST /matrix-cells/sync-gaps -> 201 and upserts cells", async () => {
    const res = await request(app.getHttpServer()).post(`/brands/${brandId}/matrix-cells/sync-gaps`);
    expect(res.status).toBe(201);
    expect(res.body.cells.length).toBeGreaterThan(0);

    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/matrix-cells`);
    expect(list.body.some((c: { intent: string }) => c.intent === "品牌了解")).toBe(true);
  });

  it("DELETE /matrix-cells/:id -> 200", async () => {
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/matrix-cells`);
    const cellId = list.body[0].id as string;
    const res = await request(app.getHttpServer()).delete(`/brands/${brandId}/matrix-cells/${cellId}`);
    expect(res.status).toBe(200);
  });
});
