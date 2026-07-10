import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "./brand.controller";
import { BrandService } from "./brand-service";
import { BrandRepository } from "./brand-repository";
import { type Brand, type BrandInput } from "./brand";

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


describe("Brand API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController],
      providers: [
        BrandService,
        { provide: BrandRepository, useClass: FakeBrandRepository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /brands -> 201 with generated id", async () => {
    const res = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "A SaaS brand" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe("Acme");
  });

  it("GET /brands -> 200 lists brands", async () => {
    await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Gamma", definition: "Third brand" });
    const res = await request(app.getHttpServer()).get("/brands");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /brands/:id -> 200 on hit, 404 on miss", async () => {
    const created = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Beta", definition: "Another brand" });
    const ok = await request(app.getHttpServer()).get(`/brands/${created.body.id}`);
    expect(ok.status).toBe(200);
    const miss = await request(app.getHttpServer()).get("/brands/unknown-id");
    expect(miss.status).toBe(404);
  });

  it("POST /brands with invalid body -> 400", async () => {
    const res = await request(app.getHttpServer()).post("/brands").send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("DELETE /brands/:id -> 200 removes brand", async () => {
    const created = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Temp", definition: "To delete" });
    const res = await request(app.getHttpServer()).delete(`/brands/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const miss = await request(app.getHttpServer()).get(`/brands/${created.body.id}`);
    expect(miss.status).toBe(404);
  });

  it("PUT /brands/:id -> 200 updates brand", async () => {
    const created = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "???? SaaS" });
    const res = await request(app.getHttpServer())
      .put(`/brands/${created.body.id}`)
      .send({ definition: "项目管理 SaaS" });
    expect(res.status).toBe(200);
    expect(res.body.definition).toBe("项目管理 SaaS");
  });
});
