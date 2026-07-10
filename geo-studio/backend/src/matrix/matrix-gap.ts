import { type DiagnosticRunItemRecord } from "../diagnostics/diagnostic-run-types";

export interface MatrixGap {
  intent: string;
  angle: string;
  title: string;
  priority: number;
  reasons: string[];
  questionCategory: string;
  questionText: string;
}

export interface MatrixGapAnalysis {
  diagnosticRunId: string;
  capturedAt: string;
  gaps: MatrixGap[];
}

const ACCURACY_GAP_THRESHOLD = 0.5;

export function isGapItem(item: DiagnosticRunItemRecord): boolean {
  const { score } = item;
  if (!score.mentioned) return true;
  if (score.accuracy < ACCURACY_GAP_THRESHOLD) return true;
  if (score.sentiment === "negative") return true;
  return false;
}

export function gapPriority(item: DiagnosticRunItemRecord): number {
  const { score } = item;
  let priority = 10;
  if (!score.mentioned) priority += 50;
  if (score.accuracy < ACCURACY_GAP_THRESHOLD) priority += 30;
  if (score.sentiment === "negative") priority += 20;
  return Math.min(priority, 100);
}

export function gapReasons(item: DiagnosticRunItemRecord): string[] {
  const reasons: string[] = [];
  if (!item.score.mentioned) reasons.push("未提及品牌");
  if (item.score.accuracy < ACCURACY_GAP_THRESHOLD) reasons.push("准确性偏低");
  if (item.score.sentiment === "negative") reasons.push("情感偏负面");
  return reasons;
}

export function mapItemToMatrixGap(item: DiagnosticRunItemRecord): MatrixGap {
  const mapped = mapCategoryToIntentAngle(item.question.category, item.question.text);
  return {
    ...mapped,
    priority: gapPriority(item),
    reasons: gapReasons(item),
    questionCategory: item.question.category,
    questionText: item.question.text,
  };
}

export function mapCategoryToIntentAngle(
  category: string,
  questionText: string,
): Pick<MatrixGap, "intent" | "angle" | "title"> {
  switch (category) {
    case "category":
      return {
        intent: "品类认知",
        angle: "推荐曝光",
        title: "提升品类推荐位可见度",
      };
    case "brand":
      return {
        intent: "品牌了解",
        angle: "核心价值",
        title: "强化品牌核心叙事",
      };
    case "attribute": {
      const attr = extractAttribute(questionText);
      return {
        intent: "属性认知",
        angle: attr ?? "关键属性",
        title: attr ? `补齐「${attr}」属性表达` : "补齐关键属性表达",
      };
    }
    case "comparison":
      return {
        intent: "选型对比",
        angle: "竞品差异",
        title: "优化竞品对比话术",
      };
    default:
      return {
        intent: "综合覆盖",
        angle: category,
        title: questionText.slice(0, 80),
      };
  }
}

function extractAttribute(questionText: string): string | null {
  const match = questionText.match(/在(.+?)方面/);
  return match?.[1]?.trim() ?? null;
}

export function mergeGaps(gaps: MatrixGap[]): MatrixGap[] {
  const byKey = new Map<string, MatrixGap>();
  for (const gap of gaps) {
    const key = `${gap.intent}::${gap.angle}`;
    const existing = byKey.get(key);
    if (!existing || gap.priority > existing.priority) {
      byKey.set(key, {
        ...gap,
        reasons: existing
          ? [...new Set([...existing.reasons, ...gap.reasons])]
          : gap.reasons,
      });
    } else if (existing) {
      existing.reasons = [...new Set([...existing.reasons, ...gap.reasons])];
    }
  }
  return [...byKey.values()].sort((a, b) => b.priority - a.priority);
}

export function analyzeDiagnosticGaps(
  run: { id: string; capturedAt: string; items: DiagnosticRunItemRecord[] },
): MatrixGapAnalysis {
  const gaps = mergeGaps(
    run.items.filter(isGapItem).map(mapItemToMatrixGap),
  );
  return {
    diagnosticRunId: run.id,
    capturedAt: run.capturedAt,
    gaps,
  };
}
