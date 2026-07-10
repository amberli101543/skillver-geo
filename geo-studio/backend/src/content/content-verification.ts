import { type Brand } from "../brand/brand";
import { type MatrixCell } from "../matrix/matrix-cell";
import { type EngineTestWithScore } from "../engine/engine-test-service";
import { LOW_ACCURACY_THRESHOLD } from "../scoring/scoring-advice";
import { type Sentiment } from "../scoring/score";

export type ContentVerificationDirection = "favorable" | "neutral" | "needs_improvement";

export interface ContentVerification {
  verifiedAt: string;
  question: string;
  engineId: string;
  mentioned: boolean;
  accuracy: number;
  sentiment: Sentiment;
  sourcesCount: number;
  direction: ContentVerificationDirection;
  summary: string;
  draftAlignment: {
    keyPhrasesInAnswer: number;
    keyPhrasesChecked: number;
    brandInAnswer: boolean;
  };
  hints: string[];
}

export interface BuildContentVerificationInput {
  brand: Brand;
  cell: MatrixCell;
  draftBody: string;
  engineResult: EngineTestWithScore;
}

export function buildVerificationQuestion(brand: Brand, cell: MatrixCell): string {
  switch (cell.intent) {
    case "品类认知":
      return `${cell.angle}有哪些值得推荐的选择？`;
    case "品牌了解":
      return `${brand.name} 是什么？`;
    case "属性认知":
      return `${brand.name} 在${cell.angle}方面表现如何？`;
    case "选型对比":
      return `${brand.name} 和同类产品相比有什么优势？`;
    default:
      return `${brand.name} ${cell.title}`;
  }
}

export function extractDraftKeyPhrases(body: string, max = 3): string[] {
  const chunks = body
    .split(/[\n。！？；;,.]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
  const phrases: string[] = [];
  for (const chunk of chunks) {
    const phrase = chunk.slice(0, Math.min(24, chunk.length)).trim();
    if (phrase.length >= 6 && !phrases.includes(phrase)) {
      phrases.push(phrase);
    }
    if (phrases.length >= max) {
      break;
    }
  }
  return phrases;
}

export function resolveVerificationDirection(score: {
  mentioned: boolean;
  accuracy: number;
  sentiment: Sentiment;
}): ContentVerificationDirection {
  if (!score.mentioned || score.accuracy < LOW_ACCURACY_THRESHOLD || score.sentiment === "negative") {
    return "needs_improvement";
  }
  if (score.accuracy >= 0.7 && score.sentiment === "positive") {
    return "favorable";
  }
  return "neutral";
}

export function buildVerificationSummary(
  direction: ContentVerificationDirection,
  score: { mentioned: boolean; accuracy: number; sentiment: Sentiment },
): string {
  switch (direction) {
    case "favorable":
      return "引擎回答已提及品牌且准确性较好，初稿方向与可被引用目标一致";
    case "neutral":
      if (!score.mentioned) {
        return "引擎尚未稳定提及品牌，需加强公开渠道覆盖";
      }
      return "引擎已提及品牌，但准确性或情感仍有提升空间";
    case "needs_improvement":
      if (!score.mentioned) {
        return "引擎回答未提及品牌，初稿尚未转化为可见引用信号";
      }
      if (score.sentiment === "negative") {
        return "引擎回答对品牌情感偏负面，需用案例与数据对冲";
      }
      return "引擎回答准确性偏低，初稿关键词尚未被有效吸收";
  }
}

export function buildVerificationHints(input: {
  brand: Brand;
  cell: MatrixCell;
  draftBody: string;
  engineAnswer: string;
  score: EngineTestWithScore["score"];
  keyPhrasesInAnswer: number;
  keyPhrasesChecked: number;
}): string[] {
  const hints: string[] = [];
  const surface = contentSurfaceForIntent(input.cell.intent);

  if (!input.score.mentioned) {
    hints.push(
      `将初稿首段含「${input.brand.name}」的表述发布至${surface}，并确保可被搜索引擎索引`,
    );
  }

  if (input.score.accuracy < LOW_ACCURACY_THRESHOLD) {
    const snippet = input.brand.definition.trim().slice(0, 20);
    hints.push(
      snippet
        ? `在${surface}补充品牌定义「${snippet}…」，与验证问题「${buildVerificationQuestion(input.brand, input.cell).slice(0, 32)}…」对齐`
        : `修订初稿，使核心事实与验证问题直接对应后再分发`,
    );
  }

  if (input.score.sentiment === "negative") {
    hints.push(`针对「${input.cell.title}」发布客户案例或第三方评测，改善引擎情感倾向`);
  }

  if (input.score.sourcesCount === 0) {
    hints.push(`为${surface}增加权威外链（官网文档、行业报告），提升引擎可引用信源`);
  }

  if (input.keyPhrasesChecked > 0 && input.keyPhrasesInAnswer === 0) {
    hints.push(
      `初稿关键句尚未出现在引擎回答中，完成分发后 1–2 周重新验证`,
    );
  } else if (
    input.keyPhrasesChecked > 0 &&
    input.keyPhrasesInAnswer < input.keyPhrasesChecked
  ) {
    hints.push(`部分初稿关键词已被引擎吸收，继续强化未覆盖表述并再次验证`);
  }

  if (hints.length === 0 && input.score.mentioned) {
    hints.push(`保持${surface}内容更新，并在下次跑批后对比提及率变化`);
  }

  return hints;
}

function contentSurfaceForIntent(intent: string): string {
  switch (intent) {
    case "品类认知":
      return "品类介绍页与榜单投稿";
    case "品牌了解":
      return "官网 About 与 FAQ";
    case "属性认知":
      return "产品功能页";
    case "选型对比":
      return "竞品对比页";
    default:
      return "官网与公开文档";
  }
}

export function buildContentVerification(input: BuildContentVerificationInput): ContentVerification {
  const { brand, cell, draftBody, engineResult } = input;
  const { score } = engineResult;
  const keyPhrases = extractDraftKeyPhrases(draftBody);
  const keyPhrasesInAnswer = keyPhrases.filter((p) => engineResult.answer.includes(p)).length;
  const brandInAnswer = engineResult.answer.toLowerCase().includes(brand.name.toLowerCase());
  const direction = resolveVerificationDirection(score);
  const question = buildVerificationQuestion(brand, cell);

  return {
    verifiedAt: engineResult.runAt,
    question,
    engineId: engineResult.engineId,
    mentioned: score.mentioned,
    accuracy: score.accuracy,
    sentiment: score.sentiment,
    sourcesCount: score.sourcesCount,
    direction,
    summary: buildVerificationSummary(direction, score),
    draftAlignment: {
      keyPhrasesInAnswer,
      keyPhrasesChecked: keyPhrases.length,
      brandInAnswer,
    },
    hints: buildVerificationHints({
      brand,
      cell,
      draftBody,
      engineAnswer: engineResult.answer,
      score,
      keyPhrasesInAnswer,
      keyPhrasesChecked: keyPhrases.length,
    }),
  };
}
