import { describe, expect, it } from "vitest";
import { EngineAiFacade } from "../ai/engine.facade";
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "./engine-connector";
import {
  DEFAULT_ENGINE_ID,
  EngineConnectorNotFoundError,
  EngineRegistry,
  RegisteredEngineConnector,
} from "./engine-registry";
import { ProxyEngineConnector } from "./proxy-engine-connector";
import { PerplexityEngineConnector } from "./connectors/perplexity-engine-connector";

class StubEngineConnector extends EngineConnector {
  constructor(private readonly engineId: string) {
    super();
  }
  async run(question: string): Promise<EngineAnswer> {
    return { ...stubEngineAnswer(question), engineId: this.engineId };
  }
}

describe("EngineRegistry", () => {
  function createRegistry(): EngineRegistry {
    const registry = new EngineRegistry(
      new ProxyEngineConnector(new EngineAiFacade()),
      new PerplexityEngineConnector(),
    );
    registry.onModuleInit();
    return registry;
  }

  it("registers default openai-proxy connector", () => {
    const registry = createRegistry();
    expect(registry.listCapabilities()).toHaveLength(9);
    expect(registry.listCapabilities()[0]?.id).toBe(DEFAULT_ENGINE_ID);
  });

  it("registers all chat engine vendors", () => {
    const registry = createRegistry();
    const ids = registry.listCapabilities().map((c) => c.id);
    for (const id of ["doubao", "kimi", "deepseek", "yuanbao", "gemini", "chatgpt", "claude"]) {
      expect(ids).toContain(id);
    }
  });

  it("vendor connectors answer in stub mode without keys", async () => {
    delete process.env.DOUBAO_API_KEY;
    delete process.env.ARK_API_KEY;
    const registry = createRegistry();
    const answer = await registry.resolve("doubao").run("Skillver 是什么？");
    expect(answer.engineId).toBe("doubao-stub");
    expect(answer.answer).toContain("Skillver 是什么？");
  });

  it("resolve returns registered connector", async () => {
    const registry = createRegistry();
    const answer = await registry.resolve().run("test");
    expect(answer.engineId).toBe("proxy-engine-stub");
  });

  it("RegisteredEngineConnector delegates to registry default", async () => {
    const registry = createRegistry();
    const connector = new RegisteredEngineConnector(registry);
    const answer = await connector.run("Q");
    expect(answer.answer).toContain("Q");
  });

  it("throws for unknown engine id", () => {
    const registry = createRegistry();
    expect(() => registry.resolve("unknown")).toThrow(EngineConnectorNotFoundError);
  });

  it("allows registering additional engines", async () => {
    const registry = createRegistry();
    const extra = new StubEngineConnector("custom-engine");
    registry.register(
      {
        id: "custom-engine",
        name: "Custom",
        description: "test",
        modes: ["stub"],
        envKeys: [],
      },
      extra,
    );
    const answer = await registry.resolve("custom-engine").run("x");
    expect(answer.engineId).toBe("custom-engine");
  });

  it("resolves perplexity connector", async () => {
    const registry = createRegistry();
    const answer = await registry.resolve("perplexity").run("Q");
    expect(answer.engineId).toBe("perplexity-stub");
  });

  it("resolveBatchEngineIds returns requested ids when valid", () => {
    const registry = createRegistry();
    expect(registry.resolveBatchEngineIds(["openai-proxy", "perplexity"])).toEqual([
      "openai-proxy",
      "perplexity",
    ]);
  });

  it("resolveBatchEngineIds defaults to all registered engines", () => {
    const registry = createRegistry();
    expect(registry.resolveBatchEngineIds()).toEqual([
      "openai-proxy",
      "perplexity",
      "doubao",
      "kimi",
      "deepseek",
      "yuanbao",
      "gemini",
      "chatgpt",
      "claude",
    ]);
  });

  it("resolveBatchEngineIds throws for unknown id", () => {
    const registry = createRegistry();
    expect(() => registry.resolveBatchEngineIds(["unknown"])).toThrow(EngineConnectorNotFoundError);
  });
});
