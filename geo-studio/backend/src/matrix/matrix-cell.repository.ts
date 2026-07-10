import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  DEFAULT_MATRIX_AUDIENCE,
  DEFAULT_MATRIX_STAGE,
  type MatrixCell,
  type MatrixCellInput,
  type MatrixCellUpdate,
} from "./matrix-cell";

export abstract class MatrixCellRepository {
  abstract listByBrand(brandId: string): Promise<MatrixCell[]>;
  abstract findById(brandId: string, cellId: string): Promise<MatrixCell | null>;
  abstract create(brandId: string, input: Omit<MatrixCellInput, "brandId">): Promise<MatrixCell>;
  abstract update(brandId: string, cellId: string, input: MatrixCellUpdate): Promise<MatrixCell | null>;
  abstract delete(brandId: string, cellId: string): Promise<boolean>;
  abstract upsertByIntentAngle(
    brandId: string,
    input: Omit<MatrixCellInput, "brandId">,
  ): Promise<MatrixCell>;
}

function toMatrixCell(row: {
  id: string;
  brandId: string;
  intent: string;
  angle: string;
  stage?: string | null;
  audience?: string | null;
  title: string;
  priority: number;
}): MatrixCell {
  return {
    id: row.id,
    brandId: row.brandId,
    intent: row.intent,
    angle: row.angle,
    stage: row.stage?.trim() || DEFAULT_MATRIX_STAGE,
    audience: row.audience?.trim() || DEFAULT_MATRIX_AUDIENCE,
    title: row.title,
    priority: row.priority,
  };
}

@Injectable()
export class PrismaMatrixCellRepository extends MatrixCellRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByBrand(brandId: string): Promise<MatrixCell[]> {
    const rows = await this.prisma.matrixCell.findMany({
      where: { brandId },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toMatrixCell);
  }

  async findById(brandId: string, cellId: string): Promise<MatrixCell | null> {
    const row = await this.prisma.matrixCell.findFirst({ where: { id: cellId, brandId } });
    return row ? toMatrixCell(row) : null;
  }

  async create(brandId: string, input: Omit<MatrixCellInput, "brandId">): Promise<MatrixCell> {
    const row = await this.prisma.matrixCell.create({
      data: {
        brandId,
        intent: input.intent,
        angle: input.angle,
        stage: input.stage,
        audience: input.audience,
        title: input.title,
        priority: input.priority,
      },
    });
    return toMatrixCell(row);
  }

  async update(
    brandId: string,
    cellId: string,
    input: MatrixCellUpdate,
  ): Promise<MatrixCell | null> {
    const existing = await this.findById(brandId, cellId);
    if (!existing) return null;
    try {
      const row = await this.prisma.matrixCell.update({
        where: { id: cellId },
        data: {
          ...(input.intent !== undefined ? { intent: input.intent } : {}),
          ...(input.angle !== undefined ? { angle: input.angle } : {}),
          ...(input.stage !== undefined ? { stage: input.stage } : {}),
          ...(input.audience !== undefined ? { audience: input.audience } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      });
      return toMatrixCell(row);
    } catch {
      return null;
    }
  }

  async delete(brandId: string, cellId: string): Promise<boolean> {
    const result = await this.prisma.matrixCell.deleteMany({ where: { id: cellId, brandId } });
    return result.count > 0;
  }

  async upsertByIntentAngle(
    brandId: string,
    input: Omit<MatrixCellInput, "brandId">,
  ): Promise<MatrixCell> {
    const row = await this.prisma.matrixCell.upsert({
      where: {
        brandId_intent_angle_stage_audience: {
          brandId,
          intent: input.intent,
          angle: input.angle,
          stage: input.stage,
          audience: input.audience,
        },
      },
      create: {
        brandId,
        intent: input.intent,
        angle: input.angle,
        stage: input.stage,
        audience: input.audience,
        title: input.title,
        priority: input.priority,
      },
      update: {
        title: input.title,
        priority: input.priority,
      },
    });
    return toMatrixCell(row);
  }
}
