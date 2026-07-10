import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { MetricsService, type BrandMetricsTrend } from "./metrics.service";
import { type BaselineMetric } from "./metric-types";

@Controller("brands/:id/metrics")
export class MetricsController {
  constructor(
    private readonly brands: BrandService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  async trend(
    @Param("id") brandId: string,
    @Query("engineId") engineId?: string,
  ): Promise<BrandMetricsTrend> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new NotFoundException(`brand ${brandId} not found`);
    }
    return this.metrics.getTrend(brandId, engineId);
  }
}

export type { BaselineMetric };
