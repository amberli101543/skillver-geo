import { type EngineSourceRecord } from "./diagnostic-run-types";

export type DiagnosticCredibilityLevel = "business-ready" | "partial" | "demo";

export interface DiagnosticCredibility {
  level: DiagnosticCredibilityLevel;
  /** Chinese label for UI */
  label: string;
  reasons: string[];
  stubItemRatio: number;
  avgSourcesCount: number;
  liveEngineIds: string[];
  stubEngineIds: string[];
}

export interface CredibilityItemInput {
  engineTest: {
    engineId: string;
    answer: string;
    sources: EngineSourceRecord[];
  };
  score: {
    sourcesCount: number;
  };
}

export interface CredibilityRunInput {
  scoringMode?: string;
  items: CredibilityItemInput[];
}

const LEVEL_LABELS: Record<DiagnosticCredibilityLevel, string> = {
  "business-ready": "可决策",
  partial: "部分可用",
  demo: "演示模式",
};

export function isStubEngineTest(engineId: string, answer?: string): boolean {
  if (engineId === "proxy-engine-stub" || engineId.endsWith("-stub")) {
    return true;
  }
  if (answer?.startsWith("[stub]")) {
    return true;
  }
  return false;
}

export function assessDiagnosticCredibility(input: CredibilityRunInput): DiagnosticCredibility {
  const { items, scoringMode } = input;
  const total = items.length;

  if (total === 0) {
    return {
      level: "demo",
      label: LEVEL_LABELS.demo,
      reasons: ["跑批无有效题目结果"],
      stubItemRatio: 1,
      avgSourcesCount: 0,
      liveEngineIds: [],
      stubEngineIds: [],
    };
  }

  const liveEngineIds = new Set<string>();
  const stubEngineIds = new Set<string>();
  let stubCount = 0;
  let sourcesSum = 0;

  for (const item of items) {
    const { engineId, answer } = item.engineTest;
    if (isStubEngineTest(engineId, answer)) {
      stubCount += 1;
      stubEngineIds.add(engineId);
    } else {
      liveEngineIds.add(engineId);
    }
    sourcesSum += item.score.sourcesCount;
  }

  const stubItemRatio = stubCount / total;
  const avgSourcesCount = sourcesSum / total;
  const reasons: string[] = [];

  if (stubCount === total) {
    reasons.push("全部引擎回答为 stub 演示数据");
  } else if (stubCount > 0) {
    reasons.push(`${stubCount}/${total} 题使用 stub 引擎（${Math.round(stubItemRatio * 100)}%）`);
  }

  if (scoringMode === "rule") {
    reasons.push("评分为规则模式，未启用 LLM");
  } else if (scoringMode !== "llm") {
    reasons.push("跑批未记录 LLM 评分模式");
  }

  if (avgSourcesCount < 1) {
    reasons.push(`平均引用来源 ${avgSourcesCount.toFixed(1)}，低于可决策阈值`);
  }

  let level: DiagnosticCredibilityLevel;
  if (stubItemRatio >= 0.5) {
    level = "demo";
  } else if (stubItemRatio > 0 || scoringMode !== "llm" || avgSourcesCount < 1) {
    level = "partial";
  } else {
    level = "business-ready";
    if (reasons.length === 0) {
      reasons.push("全部 live 引擎、LLM 评分且引用来源充足");
    }
  }

  return {
    level,
    label: LEVEL_LABELS[level],
    reasons,
    stubItemRatio,
    avgSourcesCount,
    liveEngineIds: [...liveEngineIds].sort(),
    stubEngineIds: [...stubEngineIds].sort(),
  };
}
