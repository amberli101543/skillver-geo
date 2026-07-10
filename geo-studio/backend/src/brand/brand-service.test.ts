import { beforeEach, describe, expect, it } from "vitest";
import { BrandService, BrandValidationError } from "./brand-service";
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

const input: BrandInput = { name: "Acme", definition: "A SaaS brand" };

describe("BrandService (repository-backed)", () => {
  let svc: BrandService;

  beforeEach(() => {
    svc = new BrandService(new FakeBrandRepository());
  });

  it("creates a brand with a generated id and reads it back", async () => {
    const created = await svc.create(input);
    expect(created.id).toBeTruthy();
    expect(await svc.get(created.id)).toEqual(created);
  });

  it("lists created brands", async () => {
    await svc.create(input);
    await svc.create({ name: "Beta", definition: "Another" });
    expect(await svc.list()).toHaveLength(2);
  });

  it("returns undefined for an unknown id", async () => {
    expect(await svc.get("missing")).toBeUndefined();
  });

  it("rejects invalid input with BrandValidationError", async () => {
    await expect(svc.create({ name: "", definition: "" })).rejects.toBeInstanceOf(
      BrandValidationError,
    );
  });
});
