import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EngineAiFacade } from "../ai/engine.facade";
import { EngineRegistryController } from "./engine-registry.controller";
import { EngineRegistry } from "./engine-registry";
import { PerplexityEngineConnector } from "./connectors/perplexity-engine-connector";
import { ProxyEngineConnector } from "./proxy-engine-connector";

describe("Engine Registry API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const registry = new EngineRegistry(
      new ProxyEngineConnector(new EngineAiFacade()),
      new PerplexityEngineConnector(),
    );
    registry.onModuleInit();

    const moduleRef = await Test.createTestingModule({
      controllers: [EngineRegistryController],
      providers: [{ provide: EngineRegistry, useValue: registry }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /engines returns registered capabilities", async () => {
    const res = await request(app.getHttpServer()).get("/engines");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((c: { id: string }) => c.id === "openai-proxy")).toBe(true);
    expect(res.body.some((c: { id: string }) => c.id === "perplexity")).toBe(true);
  });
});
