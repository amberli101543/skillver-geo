import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "./brand.controller";
import { BrandEntityController } from "./brand-entity.controller";
import { BrandService } from "./brand-service";
import { BrandEntityService } from "./brand-entity.service";
import { BrandRepository } from "./brand-repository";
import { BrandEntityRepository } from "./brand-entity.repository";
import { type Brand, type BrandInput } from "./brand";
import { type Assertion, type AssertionInput } from "./assertion";
import { type Competitor, type CompetitorInput } from "./competitor";

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

describe("Brand Entity API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController, BrandEntityController],
      providers: [
        BrandService,
        BrandEntityService,
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "项目管理 SaaS" });
    brandId = res.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST/GET assertions", async () => {
    const created = await request(app.getHttpServer())
      .post(`/brands/${brandId}/assertions`)
      .send({ text: "行业领先", evidence: "报告链接" });
    expect(created.status).toBe(201);
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/assertions`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it("POST/GET/DELETE competitors", async () => {
    const created = await request(app.getHttpServer())
      .post(`/brands/${brandId}/competitors`)
      .send({ name: "Beta" });
    expect(created.status).toBe(201);
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/competitors`);
    expect(list.body).toHaveLength(1);
    const del = await request(app.getHttpServer()).delete(
      `/brands/${brandId}/competitors/${created.body.id}`,
    );
    expect(del.status).toBe(200);
  });
});
