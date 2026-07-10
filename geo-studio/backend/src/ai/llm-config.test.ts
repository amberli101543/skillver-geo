import { afterEach, describe, expect, it } from "vitest";
import { setAiSettingsOverrides } from "./ai-settings.store";
import { resolveEngineMode, resolveScoringMode } from "./llm-config";

const emptyOverrides = {
  engineMode: null,
  scoringMode: null,
  contentMode: null,
  openAiModel: null,
  openAiApiKey: null,
  modelCatalog: [],
  promptVersions: { engine: null, scoring: null, content: null },
};

describe("llm-config", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    setAiSettingsOverrides(emptyOverrides);
  });

  it("uses stub engine mode without API key", () => {
    delete process.env.OPENAI_API_KEY;
    expect(resolveEngineMode()).toBe("stub");
    expect(resolveScoringMode()).toBe("rule");
  });

  it("uses live engine and llm scoring when key exists", () => {
    process.env.OPENAI_API_KEY = "test-key";
    expect(resolveEngineMode()).toBe("live");
    expect(resolveScoringMode()).toBe("llm");
  });

  it("forces stub engine mode when ENGINE_MODE=stub", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.ENGINE_MODE = "stub";
    expect(resolveEngineMode()).toBe("stub");
  });

  it("forces rule scoring when SCORING_MODE=rule", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.SCORING_MODE = "rule";
    expect(resolveScoringMode()).toBe("rule");
  });

  it("prefers database overrides over env", () => {
    process.env.OPENAI_API_KEY = "test-key";
    setAiSettingsOverrides({
      ...emptyOverrides,
      engineMode: "stub",
      scoringMode: "rule",
    });
    expect(resolveEngineMode()).toBe("stub");
    expect(resolveScoringMode()).toBe("rule");
  });
});
