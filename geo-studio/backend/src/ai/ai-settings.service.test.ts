import { describe, expect, it } from "vitest";
import { AiSettingsRepository } from "./ai-settings.repository";
import { InMemoryAiSettingsRepository } from "./ai-settings.repository.test-helper";
import { AiSettingsService } from "./ai-settings.service";

describe("AiSettingsService prompt versions", () => {
  function createService(): AiSettingsService {
    return new AiSettingsService(new InMemoryAiSettingsRepository() as unknown as AiSettingsRepository);
  }

  it("persists and returns prompt version overrides", async () => {
    const svc = createService();
    await svc.onModuleInit();

    const updated = await svc.update({
      promptVersions: { engine: "v2", scoring: "v1", content: "v2" },
    });

    expect(updated.promptVersions).toEqual({
      engine: "v2",
      scoring: "v1",
      content: "v2",
    });
    expect(updated.runtime.promptVersions).toEqual({
      engine: "v2",
      scoring: "v1",
      content: "v2",
    });
  });

  it("rejects unknown prompt versions", async () => {
    const svc = createService();
    await svc.onModuleInit();

    const updated = await svc.update({
      promptVersions: { engine: "v9", scoring: null, content: null },
    });

    expect(updated.promptVersions.engine).toBe("v1");
  });
});
