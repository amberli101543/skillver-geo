import { beforeEach, describe, expect, it } from "vitest";
import { BrandService } from "../brand/brand-service";
import { BrandRepository } from "../brand/brand-repository";
import { type Brand, type BrandInput } from "../brand/brand";
import {
  BrandNotFoundForScheduleError,
  RetestScheduleService,
  RetestScheduleValidationError,
} from "./retest-schedule.service";
import { RetestScheduleRepository } from "./retest-schedule.repository";
import {
  computeNextRunAt,
  defaultRetestSchedule,
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

  async markRunComplete(
    brandId: string,
    runAt: Date,
    intervalHours: number,
  ): Promise<RetestSchedule> {
    const existing = this.rows.get(brandId);
    if (!existing) {
      throw new Error("schedule not found");
    }
    const row: RetestSchedule = {
      ...existing,
      lastRunAt: runAt.toISOString(),
      nextRunAt: computeNextRunAt(runAt, intervalHours).toISOString(),
    };
    this.rows.set(brandId, row);
    return row;
  }

  async findDue(now: Date): Promise<RetestSchedule[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.enabled &&
        row.nextRunAt !== undefined &&
        new Date(row.nextRunAt).getTime() <= now.getTime(),
    );
  }
}

describe("RetestScheduleService", () => {
  let brands: BrandService;
  let service: RetestScheduleService;
  let brandId: string;

  beforeEach(async () => {
    brands = new BrandService(new FakeBrandRepository());
    service = new RetestScheduleService(brands, new InMemoryRetestScheduleRepository());
    const brand = await brands.create({ name: "Acme", definition: "SaaS" });
    brandId = brand.id;
  });

  it("returns default schedule when none stored", async () => {
    const schedule = await service.getSchedule(brandId);
    expect(schedule).toEqual(defaultRetestSchedule(brandId));
  });

  it("updates schedule and sets nextRunAt when enabled", async () => {
    const updated = await service.updateSchedule(brandId, { enabled: true, intervalHours: 24 });
    expect(updated.enabled).toBe(true);
    expect(updated.intervalHours).toBe(24);
    expect(updated.nextRunAt).toBeDefined();
  });

  it("throws for unknown brand", async () => {
    await expect(service.getSchedule("missing")).rejects.toBeInstanceOf(
      BrandNotFoundForScheduleError,
    );
  });

  it("throws for invalid intervalHours", async () => {
    await expect(
      service.updateSchedule(brandId, { enabled: true, intervalHours: 0 }),
    ).rejects.toBeInstanceOf(RetestScheduleValidationError);
  });
});

describe("computeNextRunAt", () => {
  it("adds interval hours", () => {
    const from = new Date("2026-06-12T00:00:00.000Z");
    const next = computeNextRunAt(from, 24);
    expect(next.toISOString()).toBe("2026-06-13T00:00:00.000Z");
  });
});
