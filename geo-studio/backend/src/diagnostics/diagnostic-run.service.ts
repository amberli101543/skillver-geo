import { Injectable } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { BrandEntityService } from "../brand/brand-entity.service";
import { enrichItemsWithScoreAdvice } from "../scoring/scoring-advice";
import {
  DiagnosticRunRepository,
  type DiagnosticRunDetail,
  type DiagnosticRunSummary,
  type EngineRunBaselinePoint,
} from "./diagnostic-run-types";

@Injectable()
export class DiagnosticRunService {
  constructor(
    private readonly runs: DiagnosticRunRepository,
    private readonly brands: BrandService,
    private readonly entities: BrandEntityService,
  ) {}

  list(brandId: string): Promise<DiagnosticRunSummary[]> {
    return this.runs.listByBrand(brandId);
  }

  async get(brandId: string, runId: string): Promise<DiagnosticRunDetail | null> {
    const detail = await this.runs.getById(brandId, runId);
    if (!detail) {
      return null;
    }
    const brand = await this.brands.get(brandId);
    if (!brand) {
      return detail;
    }
    const assertions = await this.entities.listAssertions(brandId);
    const items = enrichItemsWithScoreAdvice(
      {
        brandName: brand.name,
        brandDefinition: brand.definition,
        brandPositioning: brand.positioning,
        assertions,
      },
      detail.items.map((item) => ({
        ...item,
        questionCategory: item.question.category,
        questionText: item.question.text,
        answer: item.engineTest.answer,
      })),
    );
    return { ...detail, items };
  }

  listEngineBaselinesByRun(brandId: string): Promise<EngineRunBaselinePoint[]> {
    return this.runs.listEngineBaselinesByRun(brandId);
  }
}
