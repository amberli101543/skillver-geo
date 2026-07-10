import { Injectable } from "@nestjs/common";
import { RagService } from "./rag/rag.service";
import { type BrandProfileKnowledge } from "./rag/rag.types";

@Injectable()
export class KnowledgeAiFacade {
  constructor(private readonly rag: RagService) {}

  syncAssertions(brandId: string, assertions: string[]): Promise<void> {
    return this.rag.syncAssertions(brandId, assertions);
  }

  syncBrandProfile(brandId: string, profile: BrandProfileKnowledge): Promise<void> {
    return this.rag.syncBrandProfile(brandId, profile);
  }
}
