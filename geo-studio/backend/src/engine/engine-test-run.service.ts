import { Injectable } from "@nestjs/common";
import { BrandNotFoundError, BrandService } from "../brand/brand-service";
import { ScoringService } from "../scoring/scoring-service";
import { EngineTestService, type EngineTestWithScore } from "./engine-test-service";

@Injectable()
export class EngineTestRunService {
  constructor(
    private readonly brands: BrandService,
    private readonly engineTests: EngineTestService,
    private readonly scoring: ScoringService,
  ) {}

  async runForBrand(brandId: string, question: string, engineId?: string): Promise<EngineTestWithScore> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundError(brandId);
    }
    const result = await this.engineTests.run(question, engineId);
    return { ...result, score: await this.scoring.score(brand, result) };
  }
}
