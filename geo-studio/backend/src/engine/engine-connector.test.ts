import { afterEach, describe, expect, it, vi } from "vitest";
import { EngineAiFacade } from "../ai/engine.facade";
import { stubEngineAnswer } from "./engine-connector";
import { ProxyEngineConnector } from "./proxy-engine-connector";

describe("stubEngineAnswer", () => {
  it("returns deterministic answer with engineId and sources", () => {
    const q = "Acme 是什么？";
    const a = stubEngineAnswer(q);
    expect(a.engineId).toBe("proxy-engine-stub");
    expect(a.answer).toContain(q);
    expect(a.sources).toHaveLength(1);
    expect(a.sources[0]?.url).toMatch(/^https:\/\/stub\.geo-studio\.local\/ref\//);
    expect(stubEngineAnswer(q)).toEqual(a);
  });
});

describe("ProxyEngineConnector", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns stub answer when no API key is set", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const connector = new ProxyEngineConnector(new EngineAiFacade());
    const result = await connector.run("有哪些值得推荐的项目管理 SaaS？");
    expect(result.engineId).toBe("proxy-engine-stub");
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
    if (prev !== undefined) {
      process.env.OPENAI_API_KEY = prev;
    }
  });

  it("uses OpenAI response when API key exists", async () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: "Acme 是一款项目管理 SaaS。",
                    sources: [{ url: "https://example.com/ref", title: "example" }],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const connector = new ProxyEngineConnector(new EngineAiFacade());
    const result = await connector.run("Acme 是什么？");
    expect(result.engineId).toContain("openai:");
    expect(result.answer).toContain("Acme");
    expect(result.sources).toHaveLength(1);

    if (prev !== undefined) {
      process.env.OPENAI_API_KEY = prev;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });
});
