import { Injectable } from "@nestjs/common";
import { type Brand } from "../brand/brand";
import { type EngineTestResult } from "../engine/engine-test-service";
import { ProxyScoringPipeline, type ScoringPipeline } from "./scoring-pipeline";
import { type TestScore } from "./score";

@Injectable()
export class ScoringService {
  constructor(private readonly pipeline: ProxyScoringPipeline) {}

  score(brand: Brand, engineResult: EngineTestResult): Promise<TestScore> {
    return this.pipeline.score(brand, engineResult);
  }
}

export { ScoringPipeline };
