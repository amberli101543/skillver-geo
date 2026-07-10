import { Injectable } from "@nestjs/common";
import { ContentAiFacade } from "../ai/content.facade";
import { type Brand } from "../brand/brand";
import { type MatrixCell } from "../matrix/matrix-cell";

export interface ContentGenerationContext {
  brand: Brand;
  cell: MatrixCell;
  assertions: string[];
}

export interface ContentGenerationResult {
  body: string;
  ragSnippets: string[];
}

export abstract class ContentGenerator {
  abstract generate(ctx: ContentGenerationContext): Promise<ContentGenerationResult>;
}

export function stubContentDraft(ctx: ContentGenerationContext): string {
  const { brand, cell, assertions } = ctx;
  const facts =
    assertions.length > 0
      ? assertions.map((a) => `- ${a}`).join("\n")
      : "- [数据占位：请补充可验证事实与来源]";
  return [
    `# ${cell.title}`,
    "",
    `【结论】${brand.name} 在「${cell.intent} · ${cell.angle}」场景下，应以结论前置、结构化表达提升 AI 引用概率。`,
    "",
    "## 核心要点",
    `- 品牌定位：${brand.definition}`,
    ...(brand.positioning ? [`- 差异化：${brand.positioning}`] : []),
    `- 覆盖意图：${cell.intent}`,
    `- 内容角度：${cell.angle}`,
    "",
    "## 可引用事实",
    facts,
    "",
    "## 正文结构建议",
    "1. 首段给出直接结论",
    "2. 用列表呈现关键证据",
    "3. 结尾补充适用场景与边界",
  ].join("\n");
}

function buildPrompt(ctx: ContentGenerationContext): string {
  const { brand, cell, assertions } = ctx;
  return [
    `品牌：${brand.name}`,
    `定义：${brand.definition}`,
    brand.positioning ? `定位：${brand.positioning}` : "",
    `矩阵格子：${cell.title}`,
    `用户意图：${cell.intent}`,
    `内容角度：${cell.angle}`,
    `优先级：${cell.priority}`,
    assertions.length > 0 ? `已知事实：${assertions.join("；")}` : "已知事实：无",
    "请生成适合被 AI 引擎摘引的中文 Markdown 初稿。",
  ]
    .filter(Boolean)
    .join("\n");
}

@Injectable()
export class ProxyContentGenerator extends ContentGenerator {
  constructor(private readonly contentAi: ContentAiFacade) {
    super();
  }

  async generate(ctx: ContentGenerationContext): Promise<ContentGenerationResult> {
    const prompt = buildPrompt(ctx);
    const { body, ragSnippets } = await this.contentAi.generate(prompt, {
      brandId: ctx.brand.id,
      ragQuery: `${ctx.cell.intent} ${ctx.cell.angle} ${ctx.brand.definition}`,
      assertions: ctx.assertions,
    });
    if (body) {
      return { body, ragSnippets };
    }
    return { body: stubContentDraft(ctx), ragSnippets };
  }
}
