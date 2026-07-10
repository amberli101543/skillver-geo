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
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import { DiagnosticController } from "./diagnostic.controller";
import { DiagnosticService } from "./diagnostic-service";

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
describe("Diagnostic API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DiagnosticController],
      providers: [
        DiagnosticService,
        BrandService,
        BrandEntityService,
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
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
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /brands/:id/questions -> 200 with brandId on each question", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/questions`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((q: { brandId: string }) => q.brandId === brandId)).toBe(true);
    expect(new Set(res.body.map((q: { category: string }) => q.category))).toEqual(
      new Set(["category", "brand"]),
    );
  });

  it("GET /brands/:id/questions for unknown brand -> 404", async () => {
    const res = await request(app.getHttpServer()).get("/brands/unknown-id/questions");
    expect(res.status).toBe(404);
  });
});
