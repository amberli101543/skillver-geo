import { Module, forwardRef } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { BrandModule } from "../brand/brand.module";
import { EngineModule } from "../engine/engine.module";
import { MatrixModule } from "../matrix/matrix.module";
import { JobsModule } from "../worker/jobs.module";
import { ContentController } from "./content.controller";
import { ContentDraftRepository, PrismaContentDraftRepository } from "./content-draft.repository";
import { ContentDraftService } from "./content-draft.service";
import { ContentGenerator, ProxyContentGenerator } from "./content-generator";

@Module({
  imports: [AiModule, BrandModule, forwardRef(() => EngineModule), MatrixModule, forwardRef(() => JobsModule)],
  controllers: [ContentController],
  providers: [
    ContentDraftService,
    { provide: ContentDraftRepository, useClass: PrismaContentDraftRepository },
    { provide: ContentGenerator, useClass: ProxyContentGenerator },
  ],
  exports: [ContentDraftService],
})
export class ContentModule {}
