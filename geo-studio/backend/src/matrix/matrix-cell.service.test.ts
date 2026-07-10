import { beforeEach, describe, expect, it } from "vitest";
import { BrandService } from "../brand/brand-service";
import { BrandRepository } from "../brand/brand-repository";
import { type Brand, type BrandInput } from "../brand/brand";
import {
  MatrixCellConflictError,
  MatrixCellService,
  MatrixCellValidationError,
} from "./matrix-cell.service";
import { MatrixCellRepository } from "./matrix-cell.repository";
import {
  matrixCellKey,
  type MatrixCell,
  type MatrixCellInput,
  type MatrixCellUpdate,
} from "./matrix-cell";

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

describe("MatrixCellService", () => {
  let service: MatrixCellService;
  let brandId: string;

  beforeEach(async () => {
    const brands = new BrandService(new FakeBrandRepository());
    service = new MatrixCellService(brands, new InMemoryMatrixCellRepository());
    const brand = await brands.create({ name: "Acme", definition: "SaaS" });
    brandId = brand.id;
  });

  it("creates and lists cells", async () => {
    const cell = await service.createCell(brandId, {
      intent: "品牌了解",
      angle: "核心价值",
      title: "强化叙事",
      priority: 40,
    });
    const list = await service.listCells(brandId);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(cell.id);
  });

  it("rejects duplicate intent+angle", async () => {
    await service.createCell(brandId, {
      intent: "品牌了解",
      angle: "核心价值",
      title: "A",
      priority: 10,
    });
    await expect(
      service.createCell(brandId, {
        intent: "品牌了解",
        angle: "核心价值",
        title: "B",
        priority: 20,
      }),
    ).rejects.toBeInstanceOf(MatrixCellConflictError);
  });

  it("validates priority range", async () => {
    await expect(
      service.createCell(brandId, {
        intent: "品牌了解",
        angle: "核心价值",
        title: "A",
        priority: 101,
      }),
    ).rejects.toBeInstanceOf(MatrixCellValidationError);
  });

  it("upserts gaps with max priority", async () => {
    await service.createCell(brandId, {
      intent: "选型对比",
      angle: "竞品差异",
      title: "old",
      priority: 30,
    });
    const upserted = await service.upsertFromGap(brandId, {
      intent: "选型对比",
      angle: "竞品差异",
      title: "new title",
      priority: 60,
    });
    expect(upserted.priority).toBe(60);
    expect(upserted.title).toBe("new title");
    expect((await service.listCells(brandId)).length).toBe(1);
  });
});
