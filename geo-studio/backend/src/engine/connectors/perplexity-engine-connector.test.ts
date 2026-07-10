import { afterEach, describe, expect, it, vi } from "vitest";
import { PerplexityEngineConnector } from "./perplexity-engine-connector";

describe("PerplexityEngineConnector", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
  });

  it("returns stub answer without API key", async () => {
    delete process.env.PERPLEXITY_API_KEY;
    const connector = new PerplexityEngineConnector();
    const answer = await connector.run("Acme 是什么？");
    expect(answer.engineId).toBe("perplexity-stub");
    expect(answer.answer).toContain("Acme 是什么？");
  });

  it("calls Perplexity API when configured", async () => {
    process.env.PERPLEXITY_API_KEY = "pplx-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("perplexity.ai");
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Acme 是项目管理 SaaS。" } }],
            citations: ["https://example.com/acme"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const connector = new PerplexityEngineConnector();
    const answer = await connector.run("Acme 是什么？");
    expect(answer.engineId).toContain("perplexity:");
    expect(answer.answer).toContain("Acme");
    expect(answer.sources[0]?.url).toBe("https://example.com/acme");
  });

  it("respects PERPLEXITY_MODE=stub", async () => {
    process.env.PERPLEXITY_API_KEY = "pplx-test";
    process.env.PERPLEXITY_MODE = "stub";
    const connector = new PerplexityEngineConnector();
    const answer = await connector.run("test");
    expect(answer.engineId).toBe("perplexity-stub");
  });
});
