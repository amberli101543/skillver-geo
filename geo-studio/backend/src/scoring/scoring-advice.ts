import { type Sentiment } from "./score";

export const LOW_ACCURACY_THRESHOLD = 0.5;

export type ScoreAdviceCategory = "mention" | "accuracy" | "sentiment" | "sources" | "assertion";

export interface ScoreAdviceAction {
  category: ScoreAdviceCategory;
  suggestion: string;
}

export interface ScoreAdvice {
  issues: string[];
  actions: ScoreAdviceAction[];
  missingAssertions: string[];
}

export interface ScoreAdviceContext {
  brandName: string;
  brandDefinition: string;
  brandPositioning?: string;
  assertions: Array<{ text: string }>;
}

export interface ScoreAdviceItemInput {
  questionCategory: string;
  questionText: string;
  answer: string;
  score: {
    mentioned: boolean;
    sentiment: Sentiment;
    accuracy: number;
    sourcesCount: number;
  };
}

export function isLowScoreItem(score: ScoreAdviceItemInput["score"]): boolean {
  if (!score.mentioned) return true;
  if (score.accuracy < LOW_ACCURACY_THRESHOLD) return true;
  if (score.sentiment === "negative") return true;
  if (score.sourcesCount === 0) return true;
  return false;
}

export function assertionReflectedInAnswer(assertionText: string, answer: string): boolean {
  const text = assertionText.trim();
  if (!text) return true;
  if (text.length <= 6) {
    return answer.includes(text);
  }
  const snippet = text.slice(0, Math.min(12, text.length));
  return answer.includes(snippet);
}

export function findMissingAssertions(
  assertions: Array<{ text: string }>,
  answer: string,
): string[] {
  return assertions
    .map((a) => a.text.trim())
    .filter((text) => text.length > 0 && !assertionReflectedInAnswer(text, answer));
}

function contentSurfaceHint(category: string): string {
  switch (category) {
    case "category":
      return "品类介绍页与行业榜单投稿";
    case "brand":
      return "官网 About 页与品牌 FAQ";
    case "attribute":
      return "产品功能页与客户案例";
    case "comparison":
      return "竞品对比页与选型指南";
    default:
      return "官网与公开文档";
  }
}

function categoryFocusLabel(category: string, questionText: string): string {
  switch (category) {
    case "category":
      return "品类推荐";
    case "brand":
      return "品牌认知";
    case "attribute": {
      const match = questionText.match(/在(.+?)方面/);
      return match?.[1]?.trim() ?? "关键属性";
    }
    case "comparison":
      return "竞品对比";
    default:
      return "相关话题";
  }
}

export function buildScoreAdvice(
  context: ScoreAdviceContext,
  item: ScoreAdviceItemInput,
): ScoreAdvice | undefined {
  const { score, answer, questionCategory, questionText } = item;
  const missingAssertions = findMissingAssertions(context.assertions, answer);
  const hasScoreGap = isLowScoreItem(score);
  const hasAssertionGap = missingAssertions.length > 0;

  if (!hasScoreGap && !hasAssertionGap) {
    return undefined;
  }

  const issues: string[] = [];
  const actions: ScoreAdviceAction[] = [];
  const surface = contentSurfaceHint(questionCategory);
  const focus = categoryFocusLabel(questionCategory, questionText);

  if (!score.mentioned) {
    issues.push("未提及品牌");
    actions.push({
      category: "mention",
      suggestion: `在${surface}首段明确写出「${context.brandName}」，并与「${focus}」类问题建立直接关联（如「${context.brandName} 是…」）`,
    });
  }

  if (score.accuracy < LOW_ACCURACY_THRESHOLD) {
    issues.push("准确性偏低");
    const defSnippet = context.brandDefinition.trim().slice(0, Math.min(24, context.brandDefinition.length));
    actions.push({
      category: "accuracy",
      suggestion: defSnippet
        ? `回答未体现品牌定义「${defSnippet}…」，请在${surface}补充该核心表述并与问题语境对齐`
        : `请在${surface}补充与「${questionText.slice(0, 40)}」直接相关的品牌事实描述`,
    });
  }

  if (score.sentiment === "negative") {
    issues.push("情感偏负面");
    actions.push({
      category: "sentiment",
      suggestion: `针对「${questionText.slice(0, 48)}」发布客户成功案例或第三方评测引用，用可验证数据对冲负面措辞`,
    });
  }

  if (score.sourcesCount === 0) {
    issues.push("缺少可引用信源");
    actions.push({
      category: "sources",
      suggestion: `为「${focus}」主题在${surface}增加权威外链（官网文档、行业报告、百科条目），便于引擎抓取引用`,
    });
  }

  for (const assertion of missingAssertions.slice(0, 3)) {
    issues.push("断言未覆盖");
    actions.push({
      category: "assertion",
      suggestion: `品牌断言「${assertion.slice(0, 48)}${assertion.length > 48 ? "…" : ""}」未在回答中体现，建议写入${surface}并在正文显性出现`,
    });
  }

  if (context.brandPositioning?.trim() && hasScoreGap && score.mentioned) {
    const positioning = context.brandPositioning.trim();
    if (!answer.includes(positioning.slice(0, Math.min(8, positioning.length)))) {
      actions.push({
        category: "accuracy",
        suggestion: `补充品牌定位「${positioning.slice(0, 32)}${positioning.length > 32 ? "…" : ""}」到${surface}，强化与问题相关的差异化表达`,
      });
    }
  }

  return {
    issues: [...new Set(issues)],
    actions,
    missingAssertions,
  };
}

export function enrichItemsWithScoreAdvice<T extends ScoreAdviceItemInput>(
  context: ScoreAdviceContext,
  items: T[],
): Array<T & { scoreAdvice?: ScoreAdvice }> {
  return items.map((item) => {
    const scoreAdvice = buildScoreAdvice(context, item);
    return scoreAdvice ? { ...item, scoreAdvice } : item;
  });
}
