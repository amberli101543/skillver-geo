import { Injectable } from "@nestjs/common";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import { MatrixCellService } from "./matrix-cell.service";
import { analyzeDiagnosticGaps, type MatrixGapAnalysis } from "./matrix-gap";
import { type MatrixCell } from "./matrix-cell";

export class NoDiagnosticRunError extends Error {
  constructor(public readonly brandId: string) {
    super(`no diagnostic run found for brand ${brandId}`);
    this.name = "NoDiagnosticRunError";
  }
}

export interface MatrixGapSyncResult {
  analysis: MatrixGapAnalysis;
  cells: MatrixCell[];
}

@Injectable()
export class MatrixGapService {
  constructor(
    private readonly runs: DiagnosticRunService,
    private readonly cells: MatrixCellService,
  ) {}

  async analyzeLatestGaps(brandId: string): Promise<MatrixGapAnalysis> {
    const runs = await this.runs.list(brandId);
    const latest = runs[0];
    if (!latest) {
      throw new NoDiagnosticRunError(brandId);
    }
    const detail = await this.runs.get(brandId, latest.id);
    if (!detail) {
      throw new NoDiagnosticRunError(brandId);
    }
    return analyzeDiagnosticGaps(detail);
  }

  async syncLatestGaps(brandId: string): Promise<MatrixGapSyncResult> {
    const analysis = await this.analyzeLatestGaps(brandId);
    const synced: MatrixCell[] = [];
    for (const gap of analysis.gaps) {
      synced.push(
        await this.cells.upsertFromGap(brandId, {
          intent: gap.intent,
          angle: gap.angle,
          title: gap.title,
          priority: gap.priority,
        }),
      );
    }
    return { analysis, cells: synced };
  }
}
