import { Module, forwardRef } from "@nestjs/common";
import { BrandModule } from "../brand/brand.module";
import { DiagnosticModule } from "../diagnostics/diagnostic.module";
import { MatrixController } from "./matrix.controller";
import { MatrixCellRepository, PrismaMatrixCellRepository } from "./matrix-cell.repository";
import { MatrixCellService } from "./matrix-cell.service";
import { MatrixGapService } from "./matrix-gap.service";
import { MatrixAssertionSyncService } from "./matrix-assertion-sync.service";

@Module({
  imports: [BrandModule, forwardRef(() => DiagnosticModule)],
  controllers: [MatrixController],
  providers: [
    MatrixCellService,
    MatrixGapService,
    MatrixAssertionSyncService,
    { provide: MatrixCellRepository, useClass: PrismaMatrixCellRepository },
  ],
  exports: [MatrixCellService, MatrixGapService, MatrixAssertionSyncService],
})
export class MatrixModule {}
