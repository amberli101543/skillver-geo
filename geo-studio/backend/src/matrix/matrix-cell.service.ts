import { Injectable } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { MatrixCellRepository } from "./matrix-cell.repository";
import {
  matrixCellKey,
  normalizeMatrixCellFields,
  validateMatrixCellInput,
  type MatrixCell,
  type MatrixCellUpdate,
  type ValidationError,
} from "./matrix-cell";

export class MatrixCellValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("matrix cell validation failed");
    this.name = "MatrixCellValidationError";
  }
}

export class BrandNotFoundForMatrixError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundForMatrixError";
  }
}

export class MatrixCellNotFoundError extends Error {
  constructor(public readonly cellId: string) {
    super(`matrix cell ${cellId} not found`);
    this.name = "MatrixCellNotFoundError";
  }
}

export class MatrixCellConflictError extends Error {
  constructor(
    public readonly intent: string,
    public readonly angle: string,
    public readonly stage: string,
    public readonly audience: string,
  ) {
    super(`matrix cell already exists for intent=${intent} angle=${angle} stage=${stage} audience=${audience}`);
    this.name = "MatrixCellConflictError";
  }
}

@Injectable()
export class MatrixCellService {
  constructor(
    private readonly brands: BrandService,
    private readonly repo: MatrixCellRepository,
  ) {}

  async listCells(brandId: string): Promise<MatrixCell[]> {
    await this.requireBrand(brandId);
    return this.repo.listByBrand(brandId);
  }

  async createCell(
    brandId: string,
    input: {
      intent: string;
      angle: string;
      title: string;
      stage?: string;
      audience?: string;
      priority?: number;
    },
  ): Promise<MatrixCell> {
    await this.requireBrand(brandId);
    const normalized = normalizeMatrixCellFields(input);
    const errors = validateMatrixCellInput({ brandId, ...normalized });
    if (errors.length > 0) {
      throw new MatrixCellValidationError(errors);
    }
    const cells = await this.repo.listByBrand(brandId);
    if (cells.some((c) => matrixCellKey(c) === matrixCellKey(normalized))) {
      throw new MatrixCellConflictError(
        normalized.intent,
        normalized.angle,
        normalized.stage,
        normalized.audience,
      );
    }
    return this.repo.create(brandId, normalized);
  }

  async updateCell(brandId: string, cellId: string, input: MatrixCellUpdate): Promise<MatrixCell> {
    await this.requireBrand(brandId);
    const existing = await this.repo.findById(brandId, cellId);
    if (!existing) {
      throw new MatrixCellNotFoundError(cellId);
    }
    const merged = {
      intent: input.intent ?? existing.intent,
      angle: input.angle ?? existing.angle,
      stage: input.stage ?? existing.stage,
      audience: input.audience ?? existing.audience,
      title: input.title ?? existing.title,
      priority: input.priority ?? existing.priority,
    };
    const errors = validateMatrixCellInput({ brandId, ...merged });
    if (errors.length > 0) {
      throw new MatrixCellValidationError(errors);
    }
    const dimensionChanged =
      merged.intent !== existing.intent ||
      merged.angle !== existing.angle ||
      merged.stage !== existing.stage ||
      merged.audience !== existing.audience;
    if (dimensionChanged) {
      const cells = await this.repo.listByBrand(brandId);
      const conflict = cells.some(
        (c) => c.id !== cellId && matrixCellKey(c) === matrixCellKey(merged),
      );
      if (conflict) {
        throw new MatrixCellConflictError(merged.intent, merged.angle, merged.stage, merged.audience);
      }
    }
    const updated = await this.repo.update(brandId, cellId, merged);
    if (!updated) {
      throw new MatrixCellNotFoundError(cellId);
    }
    return updated;
  }

  async removeCell(brandId: string, cellId: string): Promise<void> {
    await this.requireBrand(brandId);
    const deleted = await this.repo.delete(brandId, cellId);
    if (!deleted) {
      throw new MatrixCellNotFoundError(cellId);
    }
  }

  async getCell(brandId: string, cellId: string): Promise<MatrixCell | null> {
    await this.requireBrand(brandId);
    return this.repo.findById(brandId, cellId);
  }

  async upsertFromGap(
    brandId: string,
    input: { intent: string; angle: string; title: string; priority: number; stage?: string; audience?: string },
  ): Promise<MatrixCell> {
    await this.requireBrand(brandId);
    const normalized = normalizeMatrixCellFields(input);
    const cells = await this.repo.listByBrand(brandId);
    const existing = cells.find((c) => matrixCellKey(c) === matrixCellKey(normalized));
    const priority = Math.max(existing?.priority ?? 0, normalized.priority);
    return this.repo.upsertByIntentAngle(brandId, { ...normalized, priority });
  }

  private async requireBrand(brandId: string): Promise<void> {
    if (!(await this.brands.get(brandId))) {
      throw new BrandNotFoundForMatrixError(brandId);
    }
  }
}
