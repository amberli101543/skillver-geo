import { Injectable } from "@nestjs/common";
import { EmbeddingService } from "./embedding.service";
import { RagRepository } from "./rag.repository";
import { type BrandProfileKnowledge } from "./rag.types";
import { type RagRetrieveOptions } from "./rag.types";
import { cosineSimilarity, keywordOverlapScore } from "./similarity";

const DEFAULT_TOP_K = 3;

@Injectable()
export class RagService {
  constructor(
    private readonly repo: RagRepository,
    private readonly embeddings: EmbeddingService,
  ) {}

  async syncAssertions(brandId: string, assertions: string[]): Promise<void> {
    const texts = assertions.map((a) => a.trim()).filter(Boolean);
    if (texts.length === 0) {
      await this.repo.replaceBySourceType(brandId, "assertion", []);
      return;
    }

    const vectors = await this.embeddings.embedBatch(texts);
    const chunks = texts.map((text, index) => ({
      sourceType: "assertion" as const,
      text,
      embedding: vectors[index] ?? null,
    }));
    await this.repo.replaceBySourceType(brandId, "assertion", chunks);
  }

  async syncBrandProfile(brandId: string, profile: BrandProfileKnowledge): Promise<void> {
    const parts: string[] = [];
    const definition = profile.definition?.trim();
    if (definition) {
      parts.push(`品牌定义：${definition}`);
    }
    const positioning = profile.positioning?.trim();
    if (positioning) {
      parts.push(`品牌定位：${positioning}`);
    }
    if (parts.length === 0) {
      await this.repo.replaceBySourceType(brandId, "brand", []);
      return;
    }

    const text = parts.join("\n");
    const vectors = await this.embeddings.embedBatch([text]);
    await this.repo.replaceBySourceType(brandId, "brand", [
      {
        sourceType: "brand",
        text,
        embedding: vectors[0] ?? null,
      },
    ]);
  }

  async retrieve(brandId: string, query: string, options: RagRetrieveOptions = {}): Promise<string[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const topK = options.topK ?? DEFAULT_TOP_K;
    const sourceTypes = options.sourceTypes ?? ["assertion", "brand"];
    const queryEmbedding = await this.embeddings.embed(trimmedQuery);

    if (queryEmbedding) {
      const vectorHits = await this.repo.retrieveSimilar(brandId, queryEmbedding, { topK, sourceTypes });
      if (vectorHits.length > 0) {
        return vectorHits.map((hit) => hit.text);
      }
    }

    const chunks = await this.repo.listByBrand(brandId, sourceTypes);
    if (chunks.length === 0) {
      return [];
    }

    const scored = chunks.map((chunk) => {
      if (queryEmbedding && chunk.embedding) {
        return { text: chunk.text, score: cosineSimilarity(queryEmbedding, chunk.embedding) };
      }
      return { text: chunk.text, score: keywordOverlapScore(trimmedQuery, chunk.text) };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => item.text);
  }

  formatContext(snippets: string[]): string {
    if (snippets.length === 0) {
      return "";
    }
    return `\n\n参考资料（RAG 检索）：\n${snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }
}
