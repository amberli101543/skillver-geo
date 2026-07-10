import { afterEach, describe, expect, it } from "vitest";
import { setAiSettingsOverrides } from "./ai-settings.store";
import {
  contentSystemPrompt,
  engineSystemPrompt,
  listAvailablePromptVersions,
  listPromptCatalog,
  listPromptVersions,
  scoringSystemPrompt,
} from "./prompt-registry";

describe("prompt-registry", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    setAiSettingsOverrides({
      engineMode: null,
      scoringMode: null,
      contentMode: null,
      openAiModel: null,
      openAiApiKey: null,
      modelCatalog: [],
      promptVersions: { engine: null, scoring: null, content: null },
    });
  });

  it("returns configured versions when supported", () => {
    process.env.ENGINE_PROMPT_VERSION = "v1";
    process.env.SCORING_PROMPT_VERSION = "v1";
    process.env.CONTENT_PROMPT_VERSION = "v1";
    expect(listPromptVersions()).toEqual({
      engine: "v1",
      scoring: "v1",
      content: "v1",
    });
  });

  it("returns effective fallback version when configured version is unknown", () => {
    process.env.ENGINE_PROMPT_VERSION = "v9";
    process.env.SCORING_PROMPT_VERSION = "foo";
    process.env.CONTENT_PROMPT_VERSION = "bar";
    expect(listPromptVersions()).toEqual({
      engine: "v1",
      scoring: "v1",
      content: "v1",
    });
  });

  it("prefers database overrides over env", () => {
    process.env.ENGINE_PROMPT_VERSION = "v1";
    setAiSettingsOverrides({
      engineMode: null,
      scoringMode: null,
      contentMode: null,
      openAiModel: null,
      openAiApiKey: null,
      modelCatalog: [],
      promptVersions: { engine: "v2", scoring: "v2", content: "v2" },
    });
    expect(listPromptVersions()).toEqual({
      engine: "v2",
      scoring: "v2",
      content: "v2",
    });
    expect(engineSystemPrompt()).toContain("citation-ready");
    expect(scoringSystemPrompt()).toContain("brand-alignment");
    expect(contentSystemPrompt()).toContain("optimized for AI citation");
  });

  it("lists available versions for each pipeline", () => {
    const available = listAvailablePromptVersions();
    expect(available.engine).toEqual(["v1", "v2"]);
    expect(available.scoring).toEqual(["v1", "v2"]);
    expect(available.content).toEqual(["v1", "v2"]);
  });

  it("builds prompt catalog with active and available", () => {
    const catalog = listPromptCatalog();
    expect(catalog.active.engine).toBe("v1");
    expect(catalog.available.engine).toContain("v2");
  });
});
