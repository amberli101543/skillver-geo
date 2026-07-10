import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAiCompatEngineConnector, type ChatEngineVendor } from "./openai-compat-engine-connector";
import { CHAT_ENGINE_VENDORS } from "./chat-engine-vendors";

const vendor: ChatEngineVendor = {
  id: "kimi",
  name: "Kimi",
  description: "test",
  baseUrl: "https://api.moonshot.cn/v1",
  defaultModel: "kimi-k2.6",
  envPrefix: "KIMI",
  apiKeyEnvFallbacks: ["MOONSHOT_API_KEY"],
};

describe("OpenAiCompatEngineConnector", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
  });

  it("returns stub answer without API key", async () => {
    delete process.env.KIMI_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    const connector = new OpenAiCompatEngineConnector(vendor);
    const answer = await connector.run("Skillver 是什么？");
    expect(answer.engineId).toBe("kimi-stub");
    expect(answer.answer).toContain("Skillver 是什么？");
  });

  it("calls vendor endpoint with default model when configured", async () => {
    process.env.KIMI_API_KEY = "sk-test";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.moonshot.cn/v1/chat/completions");
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer sk-test");
      const body = JSON.parse(String(init?.body)) as { model: string };
      expect(body.model).toBe("kimi-k2.6");
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Skillver 是 AI 求职助手。" } }],
          citations: ["https://skillver.cn/faq"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const connector = new OpenAiCompatEngineConnector(vendor);
    const answer = await connector.run("Skillver 是什么？");
    expect(answer.engineId).toBe("kimi:kimi-k2.6");
    expect(answer.answer).toContain("Skillver");
    expect(answer.sources[0]?.url).toBe("https://skillver.cn/faq");
  });

  it("respects model and base url env overrides plus fallback api key", async () => {
    delete process.env.KIMI_API_KEY;
    process.env.MOONSHOT_API_KEY = "sk-fallback";
    process.env.KIMI_MODEL = "kimi-k2-thinking";
    process.env.KIMI_BASE_URL = "https://proxy.local/v1/";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://proxy.local/v1/chat/completions");
      const body = JSON.parse(String(init?.body)) as { model: string };
      expect(body.model).toBe("kimi-k2-thinking");
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const connector = new OpenAiCompatEngineConnector(vendor);
    const answer = await connector.run("test");
    expect(answer.engineId).toBe("kimi:kimi-k2-thinking");
  });

  it("respects <PREFIX>_MODE=stub even with key present", async () => {
    process.env.KIMI_API_KEY = "sk-test";
    process.env.KIMI_MODE = "stub";
    const connector = new OpenAiCompatEngineConnector(vendor);
    const answer = await connector.run("test");
    expect(answer.engineId).toBe("kimi-stub");
  });

  it("falls back to stub on non-200 responses", async () => {
    process.env.KIMI_API_KEY = "sk-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limited", { status: 429 })),
    );
    const connector = new OpenAiCompatEngineConnector(vendor);
    const answer = await connector.run("test");
    expect(answer.engineId).toBe("kimi-stub");
  });
});

describe("CHAT_ENGINE_VENDORS catalog", () => {
  it("covers the seven required engines with unique ids and env prefixes", () => {
    const ids = CHAT_ENGINE_VENDORS.map((v) => v.id);
    expect(ids).toEqual(["doubao", "kimi", "deepseek", "yuanbao", "gemini", "chatgpt", "claude"]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CHAT_ENGINE_VENDORS.map((v) => v.envPrefix)).size).toBe(ids.length);
    for (const v of CHAT_ENGINE_VENDORS) {
      expect(v.baseUrl).toMatch(/^https:\/\//);
      expect(v.defaultModel.length).toBeGreaterThan(0);
    }
  });
});
