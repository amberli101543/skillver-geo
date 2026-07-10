import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { DiagnosticRunService } from "./diagnostic-run.service";
import { type DiagnosticRunDetail, type DiagnosticRunSummary } from "./diagnostic-run-types";

export type { DiagnosticRunDetail, DiagnosticRunSummary };

@Controller("brands/:brandId/diagnostic-runs")
export class DiagnosticRunController {
  constructor(
    private readonly brands: BrandService,
    private readonly runs: DiagnosticRunService,
  ) {}

  @Get()
  async list(@Param("brandId") brandId: string): Promise<DiagnosticRunSummary[]> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new NotFoundException(`brand ${brandId} not found`);
    }
    return this.runs.list(brandId);
  }

  @Get(":runId")
  async get(
    @Param("brandId") brandId: string,
    @Param("runId") runId: string,
  ): Promise<DiagnosticRunDetail> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new NotFoundException(`brand ${brandId} not found`);
    }
    const detail = await this.runs.get(brandId, runId);
    if (!detail) {
      throw new NotFoundException(`diagnostic run ${runId} not found`);
    }
    return detail;
  }
}
