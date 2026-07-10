import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandEntityService } from "./brand-entity.service";
import { BrandService } from "./brand-service";
import { BrandRepository } from "./brand-repository";
import { BrandEntityRepository } from "./brand-entity.repository";
import { type Brand, type BrandInput } from "./brand";
import { type Assertion, type AssertionInput } from "./assertion";
import { type Competitor, type CompetitorInput } from "./competitor";
import { type KnowledgeAiFacade } from "../ai/knowledge.facade";

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
    const row: Assertion = {
      id: `as_${++this.seq}`,
      brandId,
      text: input.text,
      evidence: input.evidence,
    };
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

describe("BrandEntityService", () => {
  let brands: BrandService;
  let svc: BrandEntityService;
  let brandId: string;
  let knowledge: KnowledgeAiFacade;

  beforeEach(async () => {
    knowledge = {
      syncAssertions: vi.fn(async () => undefined),
      syncBrandProfile: vi.fn(async () => undefined),
    } as unknown as KnowledgeAiFacade;
    brands = new BrandService(new FakeBrandRepository());
    svc = new BrandEntityService(brands, new InMemoryBrandEntityRepository(), knowledge);
    const brand = await brands.create({ name: "Acme", definition: "SaaS" });
    brandId = brand.id;
  });

  it("creates and lists assertions", async () => {
    const created = await svc.addAssertion(brandId, {
      text: "行业领先",
      evidence: "第三方报告",
    });
    expect(created.text).toBe("行业领先");
    expect(await svc.listAssertions(brandId)).toHaveLength(1);
    expect(knowledge.syncAssertions).toHaveBeenCalledWith(brandId, ["行业领先"]);
  });

  it("reindexes assertions after delete", async () => {
    const created = await svc.addAssertion(brandId, { text: "A" });
    await svc.addAssertion(brandId, { text: "B" });
    await svc.removeAssertion(brandId, created.id);
    expect(knowledge.syncAssertions).toHaveBeenLastCalledWith(brandId, ["B"]);
  });

  it("creates and lists competitors", async () => {
    await svc.addCompetitor(brandId, { name: "Beta" });
    expect(await svc.listCompetitorNames(brandId)).toEqual(["Beta"]);
  });
});
