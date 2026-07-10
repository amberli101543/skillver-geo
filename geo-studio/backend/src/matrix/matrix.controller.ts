import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { CreateMatrixCellDto } from "./dto/create-matrix-cell.dto";
import { UpdateMatrixCellDto } from "./dto/update-matrix-cell.dto";
import {
  BrandNotFoundForMatrixError,
  MatrixCellConflictError,
  MatrixCellNotFoundError,
  MatrixCellService,
  MatrixCellValidationError,
} from "./matrix-cell.service";
import { MatrixGapService, NoDiagnosticRunError } from "./matrix-gap.service";
import {
  MatrixAssertionSyncService,
  NoAssertionsError,
} from "./matrix-assertion-sync.service";
import { type MatrixCell } from "./matrix-cell";
import { type MatrixGapAnalysis } from "./matrix-gap";
import { type MatrixGapSyncResult } from "./matrix-gap.service";

@Controller("brands/:brandId")
export class MatrixController {
  constructor(
    private readonly cells: MatrixCellService,
    private readonly gaps: MatrixGapService,
    private readonly assertionSync: MatrixAssertionSyncService,
  ) {}

  @Get("matrix-cells")
  async listCells(@Param("brandId") brandId: string): Promise<MatrixCell[]> {
    return this.handle(() => this.cells.listCells(brandId));
  }

  @Post("matrix-cells")
  async createCell(
    @Param("brandId") brandId: string,
    @Body() dto: CreateMatrixCellDto,
  ): Promise<MatrixCell> {
    return this.handle(() =>
      this.cells.createCell(brandId, {
        intent: dto.intent,
        angle: dto.angle,
        stage: dto.stage,
        audience: dto.audience,
        title: dto.title,
        priority: dto.priority ?? 0,
      }),
    );
  }

  @Put("matrix-cells/:cellId")
  async updateCell(
    @Param("brandId") brandId: string,
    @Param("cellId") cellId: string,
    @Body() dto: UpdateMatrixCellDto,
  ): Promise<MatrixCell> {
    return this.handle(() =>
      this.cells.updateCell(brandId, cellId, {
        ...(dto.intent !== undefined ? { intent: dto.intent } : {}),
        ...(dto.angle !== undefined ? { angle: dto.angle } : {}),
        ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      }),
    );
  }

  @Delete("matrix-cells/:cellId")
  async removeCell(
    @Param("brandId") brandId: string,
    @Param("cellId") cellId: string,
  ): Promise<{ deleted: true }> {
    await this.handle(() => this.cells.removeCell(brandId, cellId));
    return { deleted: true };
  }

  @Get("matrix-gaps")
  async listGaps(@Param("brandId") brandId: string): Promise<MatrixGapAnalysis> {
    return this.handle(() => this.gaps.analyzeLatestGaps(brandId));
  }

  @Post("matrix-cells/sync-gaps")
  async syncGaps(@Param("brandId") brandId: string): Promise<MatrixGapSyncResult> {
    return this.handle(() => this.gaps.syncLatestGaps(brandId));
  }

  @Post("matrix-cells/sync-assertions")
  async syncAssertions(@Param("brandId") brandId: string): Promise<{ cells: MatrixCell[] }> {
    return this.handle(() => this.assertionSync.syncFromAssertions(brandId));
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (
        err instanceof BrandNotFoundForMatrixError ||
        err instanceof MatrixCellNotFoundError ||
        err instanceof NoDiagnosticRunError ||
        err instanceof NoAssertionsError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof MatrixCellValidationError) {
        throw new BadRequestException(err.errors);
      }
      if (err instanceof MatrixCellConflictError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
