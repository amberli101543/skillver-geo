import { afterEach, describe, expect, it, vi } from "vitest";
import { setAiSettingsOverrides } from "./ai-settings.store";
import {
  activeLlmProvider,
  chatCompletionJson,
  listFallbackRoutes,
  resolveLlmRoute,
  routeFromProfile,
} from "./llm-router";

const emptyPromptVersions = { engine: null, scoring: null, content: null };

describe("llm-router", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
    setAiSettingsOverrides({
      engineMode: null,
      scoringMode: null,
      contentMode: null,
      openAiModel: null,
      openAiApiKey: null,
      modelCatalog: [],
      promptVersions: emptyPromptVersions,
    });
  });

  it("resolves openai route from env key", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(resolveLlmRoute()?.provider).toBe("openai");
    expect(activeLlmProvider()).toBe("openai");
  });

  it("resolves anthropic route from catalog profile", () => {
    setAiSettingsOverrides({
      engineMode: null,
      scoringMode: null,
      contentMode: null,
      openAiModel: "claude-3-5-haiku-latest",
      openAiApiKey: null,
      modelCatalog: [
        {
          id: "anthropic-1",
          label: "Claude Haiku",
          model: "claude-3-5-haiku-latest",
          provider: "anthropic",
          apiKey: "anthropic-key",
        },
      ],
      promptVersions: emptyPromptVersions,
    });
    const route = resolveLlmRoute();
    expect(route?.provider).toBe("anthropic");
    expect(route?.apiKey).toBe("anthropic-key");
  });

  it("builds fallback routes from catalog", () => {
    const primary = routeFromProfile({
      id: "1",
      label: "GPT",
      model: "gpt-4o-mini",
      provider: "openai",
      apiKey: "openai-key",
    })!;
    setAiSettingsOverrides({
      engineMode: null,
      scoringMode: null,
      contentMode: null,
      openAiModel: "gpt-4o-mini",
      openAiApiKey: "openai-key",
      modelCatalog: [
        { id: "1", label: "GPT", model: "gpt-4o-mini", provider: "openai", apiKey: "openai-key" },
        { id: "2", label: "Claude", model: "claude-3-5-haiku-latest", provider: "anthropic", apiKey: "anthropic-key" },
      ],
      promptVersions: emptyPromptVersions,
    });
    expect(listFallbackRoutes(primary)).toHaveLength(2);
  });

  it("calls anthropic API when provider is anthropic", async () => {
    setAiSettingsOverrides({
      engineMode: null,
      scoringMode: null,
      contentMode: null,
      openAiModel: "claude-3-5-haiku-latest",
      openAiApiKey: null,
      modelCatalog: [
        {
          id: "anthropic-1",
          label: "Claude Haiku",
          model: "claude-3-5-haiku-latest",
          provider: "anthropic",
          apiKey: "anthropic-key",
        },
      ],
      promptVersions: emptyPromptVersions,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("anthropic.com");
        return new Response(
          JSON.stringify({
            content: [{ type: "text", text: JSON.stringify({ body: "hello" }) }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const parsed = await chatCompletionJson<{ body: string }>(
      [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
      { temperature: 0.2 },
    );
    expect(parsed?.body).toBe("hello");
  });
});
