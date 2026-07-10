import { Injectable } from "@nestjs/common";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { type Brand } from "../brand/brand";
import { type EngineTestResult } from "../engine/engine-test-service";
import { scoreEngineTest, type TestScore } from "./score";

export abstract class ScoringPipeline {
  abstract score(brand: Brand, result: EngineTestResult): Promise<TestScore>;
}

@Injectable()
export class RuleScoringPipeline extends ScoringPipeline {
  async score(brand: Brand, result: EngineTestResult): Promise<TestScore> {
    return scoreEngineTest(brand, result);
  }
}

@Injectable()
export class ProxyScoringPipeline extends ScoringPipeline {
  constructor(
    private readonly rules: RuleScoringPipeline,
    private readonly scoringAi: ScoringAiFacade,
  ) {
    super();
  }

  async score(brand: Brand, result: EngineTestResult): Promise<TestScore> {
    const outcome = await this.scoringAi.score({
      brandId: brand.id,
      brandName: brand.name,
      brandDefinition: brand.definition,
      brandPositioning: brand.positioning,
      question: result.question,
      answer: result.answer,
      sourcesCount: result.sources.length,
    });
    if (outcome.score) {
      return { ...outcome.score, ragSnippets: outcome.ragSnippets };
    }
    const ruleScore = await this.rules.score(brand, result);
    return { ...ruleScore, ragSnippets: outcome.ragSnippets };
  }
}
