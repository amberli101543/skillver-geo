import { beforeEach, describe, expect, it } from "vitest";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandService } from "../brand/brand-service";
import { BrandRepository } from "../brand/brand-repository";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion, type AssertionInput } from "../brand/assertion";
import { type Competitor, type CompetitorInput } from "../brand/competitor";
import { MatrixCellService } from "../matrix/matrix-cell.service";
import { MatrixCellRepository } from "../matrix/matrix-cell.repository";
import { type MatrixCell, type MatrixCellInput, type MatrixCellUpdate } from "../matrix/matrix-cell";
import { ContentDraftRepository } from "./content-draft.repository";
import { ContentDraftService } from "./content-draft.service";
import { ContentGenerator, stubContentDraft } from "./content-generator";
import { EngineTestRunService } from "../engine/engine-test-run.service";
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

  async update(): Promise<MatrixCell | null> {
    throw new Error("not used");
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

  async listByCell(cellId: string): Promise<ContentDraft[]> {
    return this.rows.filter((r) => r.cellId === cellId);
  }

  async listByBrand(brandId: string): Promise<ContentDraft[]> {
    return this.rows;
  }

  async findById(_brandId: string, draftId: string): Promise<ContentDraft | null> {
    return this.rows.find((r) => r.id === draftId) ?? null;
  }

  async createNextVersion(cellId: string, body: string, ragSnippets?: string[]): Promise<ContentDraft> {
    const version =
      this.rows.filter((r) => r.cellId === cellId).reduce((max, r) => Math.max(max, r.version), 0) + 1;
    const now = new Date().toISOString();
    const row: ContentDraft = {
      id: `draft_${++this.seq}`,
      cellId,
      body,
      status: "draft",
      version,
      ...(ragSnippets?.length ? { ragSnippets } : {}),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return row;
  }

  async update(_brandId: string, draftId: string, input: ContentDraftUpdate): Promise<ContentDraft | null> {
    const idx = this.rows.findIndex((r) => r.id === draftId);
    if (idx < 0) return null;
    this.rows[idx] = {
      ...this.rows[idx]!,
      ...input,
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
}

class StubContentGenerator extends ContentGenerator {
  async generate(ctx: Parameters<typeof stubContentDraft>[0]) {
    return { body: stubContentDraft(ctx), ragSnippets: [] };
  }
}

describe("ContentDraftService", () => {
  let service: ContentDraftService;
  let brandId: string;
  let cellId: string;

  beforeEach(async () => {
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    const cells = new MatrixCellService(brands, new InMemoryMatrixCellRepository());
    service = new ContentDraftService(
      brands,
      entities,
      cells,
      new InMemoryContentDraftRepository(),
      new StubContentGenerator(),
      {
        runForBrand: async (_brandId: string, question: string) => ({
          question,
          engineId: "stub",
          answer: "generic answer",
          sources: [],
          runAt: new Date().toISOString(),
          score: {
            mentioned: false,
            mentionPosition: null,
            sentiment: "neutral",
            accuracy: 0.2,
            sourcesCount: 0,
          },
        }),
      } as unknown as EngineTestRunService,
    );
    const brand = await brands.create({ name: "Acme", definition: "SaaS" });
    brandId = brand.id;
    const cell = await cells.createCell(brandId, {
      intent: "品牌了解",
      angle: "核心价值",
      title: "叙事",
      priority: 10,
    });
    cellId = cell.id;
  });

  it("generates versioned drafts with verification", async () => {
    const d1 = await service.generateDraft(brandId, cellId);
    const d2 = await service.generateDraft(brandId, cellId);
    expect(d1.version).toBe(1);
    expect(d2.version).toBe(2);
    expect(d1.body).toContain("Acme");
    expect(d1.verification?.direction).toBe("needs_improvement");
    expect(d1.verification?.hints.length).toBeGreaterThan(0);
  });

  it("updates draft status", async () => {
    const draft = await service.generateDraft(brandId, cellId);
    const updated = await service.updateDraft(brandId, draft.id, { status: "review" });
    expect(updated.status).toBe("review");
  });

  it("swallows verification failure on generate but surfaces it on manual verify", async () => {
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    const cells = new MatrixCellService(brands, new InMemoryMatrixCellRepository());
    const failingService = new ContentDraftService(
      brands,
      entities,
      cells,
      new InMemoryContentDraftRepository(),
      new StubContentGenerator(),
      {
        runForBrand: async () => {
          throw new Error("engine down");
        },
      } as unknown as EngineTestRunService,
    );
    const brand = await brands.create({ name: "Acme", definition: "SaaS" });
    const cell = await cells.createCell(brand.id, {
      intent: "品牌了解",
      angle: "核心价值",
      title: "叙事",
      priority: 10,
    });

    const generated = await failingService.generateDraft(brand.id, cell.id);
    expect(generated.verification).toBeUndefined();
    await expect(failingService.verifyDraft(brand.id, generated.id)).rejects.toThrow("engine down");
  });
});
