import { Module, forwardRef } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { BrandModule } from "../brand/brand.module";
import { ScoringModule } from "../scoring/scoring.module";
import { JobsModule } from "../worker/jobs.module";
import { PerplexityEngineConnector } from "./connectors/perplexity-engine-connector";
import { EngineConnector } from "./engine-connector";
import {
  EngineRegistry,
  RegisteredEngineConnector,
} from "./engine-registry";
import { EngineRegistryController } from "./engine-registry.controller";
import { EngineTestController } from "./engine-test.controller";
import { EngineTestRunService } from "./engine-test-run.service";
import { EngineTestService } from "./engine-test-service";
import { ProxyEngineConnector } from "./proxy-engine-connector";

@Module({
  imports: [AiModule, BrandModule, ScoringModule, forwardRef(() => JobsModule)],
  controllers: [EngineRegistryController, EngineTestController],
  providers: [
    EngineTestService,
    EngineTestRunService,
    ProxyEngineConnector,
    PerplexityEngineConnector,
    EngineRegistry,
    { provide: EngineConnector, useClass: RegisteredEngineConnector },
  ],
  exports: [EngineTestService, EngineRegistry, EngineTestRunService],
})
export class EngineModule {}
