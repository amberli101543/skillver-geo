import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AiController } from "./ai.controller";
import { AiSettingsRepository } from "./ai-settings.repository";
import { AiSettingsService } from "./ai-settings.service";
import { ContentAiFacade } from "./content.facade";
import { EngineAiFacade } from "./engine.facade";
import { KnowledgeAiFacade } from "./knowledge.facade";
import { ScoringAiFacade } from "./scoring.facade";
import { EmbeddingService } from "./rag/embedding.service";
import { PrismaRagRepository, RagRepository } from "./rag/rag.repository";
import { RagService } from "./rag/rag.service";

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    AiSettingsRepository,
    AiSettingsService,
    EngineAiFacade,
    ScoringAiFacade,
    ContentAiFacade,
    KnowledgeAiFacade,
    EmbeddingService,
    { provide: RagRepository, useClass: PrismaRagRepository },
    RagService,
  ],
  exports: [AiSettingsService, EngineAiFacade, ScoringAiFacade, ContentAiFacade, KnowledgeAiFacade, RagService],
})
export class AiModule {}
