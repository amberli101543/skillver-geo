import { describe, expect, it, vi } from "vitest";
import { ContentAiFacade } from "./content.facade";
import { ScoringAiFacade } from "./scoring.facade";
import { RagService } from "./rag/rag.service";
import { InMemoryRagRepository } from "./rag/rag.repository";
import { EmbeddingService } from "./rag/embedding.service";

function stubEmbeddings(): EmbeddingService {
  return {
    embed: vi.fn(async () => null),
    embedBatch: vi.fn(async (texts: string[]) => texts.map(() => null)),
  } as unknown as EmbeddingService;
}

describe("ContentAiFacade", () => {
  it("returns ragSnippets even in stub mode", async () => {
    const rag = new RagService(new InMemoryRagRepository(), stubEmbeddings());
    const facade = new ContentAiFacade(rag);
    const result = await facade.generate("生成初稿", {
      brandId: "b1",
      ragQuery: "SSO 登录",
      assertions: ["支持 SSO 单点登录"],
    });
    expect(result.body).toBeNull();
    expect(result.ragSnippets.length).toBeGreaterThan(0);
    expect(result.ragSnippets[0]).toContain("SSO");
  });

  it("returns empty ragSnippets without brandId", async () => {
    const facade = new ContentAiFacade(new RagService(new InMemoryRagRepository(), stubEmbeddings()));
    const result = await facade.generate("prompt");
    expect(result.ragSnippets).toEqual([]);
  });
});

describe("ScoringAiFacade retrieveSnippets", () => {
  it("returns snippets for scoring context", async () => {
    const repo = new InMemoryRagRepository();
    const rag = new RagService(repo, stubEmbeddings());
    await rag.syncBrandProfile("b1", {
      definition: "项目管理 SaaS",
      positioning: "面向中小企业",
    });
    const facade = new ScoringAiFacade(rag);
    const snippets = await facade.retrieveSnippets({
      brandId: "b1",
      brandName: "Acme",
      brandDefinition: "项目管理 SaaS",
      question: "Acme 是什么",
      answer: "Acme 是 SaaS",
      sourcesCount: 1,
    });
    expect(snippets.length).toBeGreaterThan(0);
  });
});
