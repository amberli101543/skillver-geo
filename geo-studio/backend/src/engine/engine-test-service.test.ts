import { beforeEach, describe, expect, it } from "vitest";
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "./engine-connector";
import { EngineTestService } from "./engine-test-service";
import { stubEngineRegistry } from "./engine-registry.test-helper";

class FakeEngineConnector extends EngineConnector {
  async run(question: string): Promise<EngineAnswer> {
    return stubEngineAnswer(`fake:${question}`);
  }
}

describe("EngineTestService", () => {
  let svc: EngineTestService;

  beforeEach(() => {
    svc = new EngineTestService(
      stubEngineRegistry({ "openai-proxy": new FakeEngineConnector() }),
    );
  });

  it("returns structured result with question, runAt, and connector fields", async () => {
    const question = "Acme 是什么？";
    const result = await svc.run(question);
    expect(result.question).toBe(question);
    expect(result.engineId).toBe("proxy-engine-stub");
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.runAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("delegates to the injected connector", async () => {
    const result = await svc.run("test question");
    expect(result.answer).toContain("fake:test question");
  });

  it("uses registry engine id when engineId is specified", async () => {
    const result = await svc.run("Q", "openai-proxy");
    expect(result.engineId).toBe("openai-proxy");
  });
});
