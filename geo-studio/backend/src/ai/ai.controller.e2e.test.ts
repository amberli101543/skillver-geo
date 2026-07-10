import "reflect-metadata";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INestApplication } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiSettingsService } from "./ai-settings.service";
import { getAiStatus } from "./ai-status";

describe("AI status API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiSettingsService,
          useValue: {
            getView: () => ({
              engineMode: null,
              scoringMode: null,
              contentMode: null,
              openAiModel: null,
              llmProvider: null,
              availableProviders: [
                { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
                { id: "anthropic", label: "Anthropic", defaultModel: "claude-3-5-haiku-latest" },
              ],
              modelCatalog: [],
              promptVersions: { engine: "v1", scoring: "v1", content: "v1" },
              availablePromptVersions: { engine: ["v1", "v2"], scoring: ["v1", "v2"], content: ["v1", "v2"] },
              hasOpenAiKey: false,
              openAiKeyMasked: null,
              runtime: getAiStatus(),
            }),
            getPromptCatalog: () => ({
              active: { engine: "v1", scoring: "v1", content: "v1" },
              available: { engine: ["v1", "v2"], scoring: ["v1", "v2"], content: ["v1", "v2"] },
              previews: { engine: { v1: "engine v1" }, scoring: { v1: "scoring v1" }, content: { v1: "content v1" } },
            }),
            update: async () => ({
              engineMode: "live",
              scoringMode: "llm",
              contentMode: "live",
              openAiModel: null,
              llmProvider: null,
              availableProviders: [
                { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
                { id: "anthropic", label: "Anthropic", defaultModel: "claude-3-5-haiku-latest" },
              ],
              modelCatalog: [],
              promptVersions: { engine: "v1", scoring: "v1", content: "v1" },
              availablePromptVersions: { engine: ["v1", "v2"], scoring: ["v1", "v2"], content: ["v1", "v2"] },
              hasOpenAiKey: false,
              openAiKeyMasked: null,
              runtime: getAiStatus(),
            }),
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /ai/status -> 200", async () => {
    const res = await request(app.getHttpServer()).get("/ai/status");
    expect(res.status).toBe(200);
    expect(res.body.engineMode).toMatch(/stub|live/);
    expect(res.body.scoringMode).toMatch(/rule|llm/);
    expect(res.body.promptVersions.engine).toBeTruthy();
  });

  it("GET /ai/settings -> 200", async () => {
    const res = await request(app.getHttpServer()).get("/ai/settings");
    expect(res.status).toBe(200);
    expect(res.body.runtime.engineMode).toMatch(/stub|live/);
    expect(res.body.promptVersions.engine).toBe("v1");
  });

  it("GET /ai/prompts -> 200", async () => {
    const res = await request(app.getHttpServer()).get("/ai/prompts");
    expect(res.status).toBe(200);
    expect(res.body.active.engine).toBe("v1");
    expect(res.body.available.engine).toContain("v2");
  });
});
