import { describe, expect, it, vi } from "vitest";
import { EmbeddingService } from "./embedding.service";
import { InMemoryRagRepository } from "./rag.repository";
import { RagService } from "./rag.service";

describe("RagService", () => {
  it("syncs assertions and retrieves by keyword overlap without embeddings", async () => {
    const repo = new InMemoryRagRepository();
    const embeddings = {
      embed: vi.fn(async () => null),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => null)),
    } as unknown as EmbeddingService;
    const rag = new RagService(repo, embeddings);

    await rag.syncAssertions("brand_1", ["支持 SSO 单点登录", "面向中小企业"]);

    const snippets = await rag.retrieve("brand_1", "SSO 登录");
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets[0]).toContain("SSO");
  });

  it("returns empty snippets when brand has no chunks", async () => {
    const repo = new InMemoryRagRepository();
    const embeddings = {
      embed: vi.fn(async () => null),
      embedBatch: vi.fn(async () => []),
    } as unknown as EmbeddingService;
    const rag = new RagService(repo, embeddings);

    expect(await rag.retrieve("brand_1", "anything")).toEqual([]);
  });

  it("formatContext returns empty string for no snippets", () => {
    const rag = new RagService(new InMemoryRagRepository(), {} as EmbeddingService);
    expect(rag.formatContext([])).toBe("");
  });

  it("formatContext wraps snippets for prompt injection", () => {
    const rag = new RagService(new InMemoryRagRepository(), {} as EmbeddingService);
    const block = rag.formatContext(["事实 A", "事实 B"]);
    expect(block).toContain("参考资料");
    expect(block).toContain("1. 事实 A");
    expect(block).toContain("2. 事实 B");
  });

  it("clears assertion chunks when syncing empty list", async () => {
    const repo = new InMemoryRagRepository();
    const embeddings = {
      embed: vi.fn(async () => null),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => null)),
    } as unknown as EmbeddingService;
    const rag = new RagService(repo, embeddings);

    await rag.syncAssertions("brand_1", ["旧事实"]);
    await rag.syncAssertions("brand_1", []);
    expect(await rag.retrieve("brand_1", "旧事实")).toEqual([]);
  });

  it("retrieves via vector similarity when embeddings are available", async () => {
    const repo = new InMemoryRagRepository();
    const queryVector = [1, 0, 0];
    const nearVector = [0.9, 0.1, 0];
    const farVector = [0, 1, 0];
    const embeddings = {
      embed: vi.fn(async () => queryVector),
      embedBatch: vi.fn(async (texts: string[]) => texts.map((_, i) => (i === 0 ? nearVector : farVector))),
    } as unknown as EmbeddingService;
    const rag = new RagService(repo, embeddings);

    await rag.syncAssertions("brand_1", ["SSO 单点登录", "价格优势"]);
    const snippets = await rag.retrieve("brand_1", "SSO");
    expect(snippets[0]).toContain("SSO");
  });

  it("syncBrandProfile indexes definition and positioning", async () => {
    const repo = new InMemoryRagRepository();
    const embeddings = {
      embed: vi.fn(async () => [1, 0]),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => [1, 0])),
    } as unknown as EmbeddingService;
    const rag = new RagService(repo, embeddings);

    await rag.syncBrandProfile("brand_1", {
      definition: "项目管理 SaaS",
      positioning: "面向中小企业",
    });
    const snippets = await rag.retrieve("brand_1", "中小企业 SaaS", { sourceTypes: ["brand"] });
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets[0]).toContain("项目管理 SaaS");
  });
});
