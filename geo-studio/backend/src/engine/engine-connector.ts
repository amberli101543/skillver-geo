export interface EngineSource {
  url: string;
  title?: string;
}

export interface EngineAnswer {
  answer: string;
  sources: EngineSource[];
  engineId: string;
}

export abstract class EngineConnector {
  abstract run(question: string): Promise<EngineAnswer>;
}

export function stubEngineAnswer(question: string): EngineAnswer {
  const digest = simpleDigest(question);
  return {
    engineId: "proxy-engine-stub",
    answer: `[stub] 针对「${question}」的代理引擎评估回答（digest=${digest}）`,
    sources: [{ url: `https://stub.geo-studio.local/ref/${digest}`, title: "stub-source" }],
  };
}

function simpleDigest(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
