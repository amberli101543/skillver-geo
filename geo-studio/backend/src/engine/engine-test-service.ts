import { Injectable } from "@nestjs/common";
import { type TestScore } from "../scoring/score";
import { type EngineAnswer } from "./engine-connector";
import { EngineRegistry } from "./engine-registry";

export interface EngineTestResult extends EngineAnswer {
  question: string;
  runAt: string;
}

export interface EngineTestWithScore extends EngineTestResult {
  score: TestScore;
}

@Injectable()
export class EngineTestService {
  constructor(private readonly registry: EngineRegistry) {}

  async run(questionText: string, engineId?: string): Promise<EngineTestResult> {
    const resolvedId = engineId?.trim() || this.registry.getDefaultId();
    const answer = await this.registry.resolve(resolvedId).run(questionText);
    return {
      ...answer,
      engineId: engineId !== undefined ? resolvedId : answer.engineId,
      question: questionText,
      runAt: new Date().toISOString(),
    };
  }
}
