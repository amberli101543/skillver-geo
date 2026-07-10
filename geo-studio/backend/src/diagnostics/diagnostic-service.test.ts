import { beforeEach, describe, expect, it } from "vitest";
import { BrandNotFoundError, DiagnosticService } from "./diagnostic-service";
import { BrandService } from "../brand/brand-service";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandRepository } from "../brand/brand-repository";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion, type AssertionInput } from "../brand/assertion";
import { type Competitor, type CompetitorInput } from "../brand/competitor";

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
  private readonly assertions: Assertion[] = [];
  private readonly competitors: Competitor[] = [];
  private seq = 0;

  async listAssertions(brandId: string): Promise<Assertion[]> {
    return this.assertions.filter((a) => a.brandId === brandId);
  }

  async createAssertion(
    brandId: string,
    input: Omit<AssertionInput, "brandId">,
  ): Promise<Assertion> {
    const row: Assertion = { id: `as_${++this.seq}`, brandId, text: input.text, evidence: input.evidence };
    this.assertions.push(row);
    return row;
  }

  async deleteAssertion(brandId: string, assertionId: string): Promise<boolean> {
    const idx = this.assertions.findIndex((a) => a.id === assertionId && a.brandId === brandId);
    if (idx < 0) return false;
    this.assertions.splice(idx, 1);
    return true;
  }

  async listCompetitors(brandId: string): Promise<Competitor[]> {
    return this.competitors.filter((c) => c.brandId === brandId);
  }

  async createCompetitor(
    brandId: string,
    input: Omit<CompetitorInput, "brandId">,
  ): Promise<Competitor> {
    const row: Competitor = { id: `cp_${++this.seq}`, brandId, name: input.name };
    this.competitors.push(row);
    return row;
  }

  async deleteCompetitor(brandId: string, competitorId: string): Promise<boolean> {
    const idx = this.competitors.findIndex((c) => c.id === competitorId && c.brandId === brandId);
    if (idx < 0) return false;
    this.competitors.splice(idx, 1);
    return true;
  }
}

describe("DiagnosticService", () => {
  let brands: BrandService;
  let entities: BrandEntityService;
  let svc: DiagnosticService;

  beforeEach(() => {
    brands = new BrandService(new FakeBrandRepository());
    entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    svc = new DiagnosticService(brands, entities);
  });

  it("builds a question set tagged with brandId for an existing brand", async () => {
    const brand = await brands.create({ name: "Acme", definition: "项目管理 SaaS" });
    const qs = await svc.buildQuestionSet(brand.id, {
      competitors: ["Beta"],
      attributes: ["价格"],
    });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.brandId === brand.id)).toBe(true);
    expect(new Set(qs.map((q) => q.category))).toEqual(
      new Set(["category", "brand", "attribute", "comparison"]),
    );
  });

  it("merges stored competitors into comparison questions", async () => {
    const brand = await brands.create({ name: "Acme", definition: "项目管理 SaaS" });
    await entities.addCompetitor(brand.id, { name: "Gamma" });
    const qs = await svc.buildQuestionSet(brand.id);
    const comparisons = qs.filter((q) => q.category === "comparison");
    expect(comparisons.some((q) => q.text.includes("Gamma"))).toBe(true);
  });

  it("throws BrandNotFoundError for an unknown brand", async () => {
    await expect(svc.buildQuestionSet("missing")).rejects.toBeInstanceOf(BrandNotFoundError);
  });
});
