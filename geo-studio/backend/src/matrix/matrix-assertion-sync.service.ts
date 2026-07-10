import { Injectable } from "@nestjs/common";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandService } from "../brand/brand-service";
import { MatrixCellService, BrandNotFoundForMatrixError } from "./matrix-cell.service";
import { type MatrixCell } from "./matrix-cell";

export class NoAssertionsError extends Error {
  constructor(public readonly brandId: string) {
    super(`no assertions found for brand ${brandId}`);
    this.name = "NoAssertionsError";
  }
}

@Injectable()
export class MatrixAssertionSyncService {
  constructor(
    private readonly brands: BrandService,
    private readonly entities: BrandEntityService,
    private readonly cells: MatrixCellService,
  ) {}

  async syncFromAssertions(brandId: string): Promise<{ cells: MatrixCell[] }> {
    if (!(await this.brands.get(brandId))) {
      throw new BrandNotFoundForMatrixError(brandId);
    }
    const assertions = await this.entities.listAssertions(brandId);
    if (assertions.length === 0) {
      throw new NoAssertionsError(brandId);
    }
    const cells: MatrixCell[] = [];
    for (const [index, assertion] of assertions.entries()) {
      const title = assertion.text.trim().slice(0, 200);
      const angle = `a_${assertion.id.replace(/-/g, "").slice(0, 12)}`;
      const cell = await this.cells.upsertFromGap(brandId, {
        intent: "brand_claim",
        angle,
        title,
        priority: Math.min(100, 40 + index * 5),
      });
      cells.push(cell);
    }
    return { cells };
  }
}
