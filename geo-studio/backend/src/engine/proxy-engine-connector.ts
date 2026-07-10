import { Injectable } from "@nestjs/common";
import { EngineAiFacade } from "../ai/engine.facade";
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "./engine-connector";

@Injectable()
export class ProxyEngineConnector extends EngineConnector {
  constructor(private readonly engineAi: EngineAiFacade) {
    super();
  }

  async run(question: string): Promise<EngineAnswer> {
    const live = await this.engineAi.runQuestion(question);
    if (live) {
      return live;
    }
    return stubEngineAnswer(question);
  }
}
