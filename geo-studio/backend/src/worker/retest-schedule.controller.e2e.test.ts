import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "../brand/brand.controller";
import { BrandService } from "../brand/brand-service";
import { BrandRepository } from "../brand/brand-repository";
import { type Brand, type BrandInput } from "../brand/brand";
import { RetestScheduleController } from "./retest-schedule.controller";
import { RetestScheduleService } from "./retest-schedule.service";
import { RetestScheduleRepository } from "./retest-schedule.repository";
import {
  computeNextRunAt,
  DEFAULT_RETEST_INTERVAL_HOURS,
  type RetestSchedule,
  type RetestScheduleUpdate,
} from "./retest-schedule";

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
class InMemoryRetestScheduleRepository extends RetestScheduleRepository {
  private readonly rows = new Map<string, RetestSchedule>();

  async findByBrandId(brandId: string): Promise<RetestSchedule | null> {
    return this.rows.get(brandId) ?? null;
  }

  async upsert(brandId: string, input: RetestScheduleUpdate, now: Date): Promise<RetestSchedule> {
    const existing = this.rows.get(brandId);
    const nextRunAt = input.enabled
      ? existing?.nextRunAt && new Date(existing.nextRunAt) > now
        ? existing.nextRunAt
        : now.toISOString()
      : undefined;
    const row: RetestSchedule = {
      brandId,
      enabled: input.enabled,
      intervalHours: input.intervalHours,
      ...(existing?.lastRunAt ? { lastRunAt: existing.lastRunAt } : {}),
      ...(nextRunAt ? { nextRunAt } : {}),
    };
    this.rows.set(brandId, row);
    return row;
  }

  async markRunComplete(): Promise<RetestSchedule> {
    throw new Error("not used");
  }

  async findDue(): Promise<RetestSchedule[]> {
    return [];
  }
}

describe("Retest Schedule API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController, RetestScheduleController],
      providers: [
        BrandService,
        RetestScheduleService,
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: RetestScheduleRepository, useClass: InMemoryRetestScheduleRepository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "SaaS" });
    brandId = res.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /brands/:id/retest-schedule -> default when unset", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/retest-schedule`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      brandId,
      enabled: false,
      intervalHours: DEFAULT_RETEST_INTERVAL_HOURS,
    });
  });

  it("PUT /brands/:id/retest-schedule -> 200 and persists", async () => {
    const res = await request(app.getHttpServer())
      .put(`/brands/${brandId}/retest-schedule`)
      .send({ enabled: true, intervalHours: 48 });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.intervalHours).toBe(48);
    expect(res.body.nextRunAt).toBeDefined();

    const getRes = await request(app.getHttpServer()).get(`/brands/${brandId}/retest-schedule`);
    expect(getRes.body.intervalHours).toBe(48);
  });

  it("PUT invalid intervalHours -> 400", async () => {
    const res = await request(app.getHttpServer())
      .put(`/brands/${brandId}/retest-schedule`)
      .send({ enabled: true, intervalHours: 0 });
    expect(res.status).toBe(400);
  });

  it("GET unknown brand -> 404", async () => {
    const res = await request(app.getHttpServer()).get("/brands/missing/retest-schedule");
    expect(res.status).toBe(404);
  });
});

describe("computeNextRunAt", () => {
  it("is exported for worker scheduling", () => {
    const next = computeNextRunAt(new Date("2026-06-12T00:00:00.000Z"), 1);
    expect(next.toISOString()).toBe("2026-06-12T01:00:00.000Z");
  });
});
