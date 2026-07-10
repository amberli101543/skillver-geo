import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ProxyScoringPipeline, RuleScoringPipeline } from "./scoring-pipeline";
import { ScoringService } from "./scoring-service";

@Module({
  imports: [AiModule],
  providers: [ScoringService, RuleScoringPipeline, ProxyScoringPipeline],
  exports: [ScoringService],
})
export class ScoringModule {}
