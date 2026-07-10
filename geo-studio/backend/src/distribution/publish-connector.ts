import { type Brand } from "../brand/brand";
import { type ContentDraft } from "../content/content-draft";
import { type MatrixCell } from "../matrix/matrix-cell";
import { type Source } from "./source";

export interface PublishContext {
  brand: Brand;
  cell: MatrixCell;
  draft: ContentDraft;
  source: Source;
}

export interface ExportManuscript {
  filename: string;
  contentType: string;
  title: string;
  body: string;
}

export interface ApiPublishResult {
  mode: "api";
  externalUrl: string;
  channel: string;
  publishedAt: string;
}

export interface ExportPublishResult {
  mode: "export";
  export: ExportManuscript;
  channel: string;
}

export type PublishConnectorResult = ApiPublishResult | ExportPublishResult;

export class PublishConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishConnectorError";
  }
}

export abstract class PublishConnector {
  abstract publish(ctx: PublishContext): Promise<PublishConnectorResult>;
}

export function buildExportManuscript(ctx: PublishContext): ExportManuscript {
  const title = ctx.cell.title.trim() || "未命名稿件";
  const body = [
    `# ${title}`,
    "",
    `> 品牌：${ctx.brand.name}`,
    `> 意图：${ctx.cell.intent} · ${ctx.cell.angle}`,
    `> 目标渠道：${ctx.source.name}`,
    `> 初稿版本：v${ctx.draft.version}`,
    "",
    ctx.draft.body.trim(),
  ].join("\n");
  const slug = title
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return {
    filename: `${slug || "draft"}-v${ctx.draft.version}.md`,
    contentType: "text/markdown; charset=utf-8",
    title,
    body,
  };
}

export function stubApiPublish(ctx: PublishContext): ApiPublishResult {
  const digest = simpleDigest(`${ctx.draft.id}:${ctx.source.id}`);
  return {
    mode: "api",
    externalUrl: `https://stub.cms.geo-studio.local/posts/${digest}`,
    channel: ctx.source.name,
    publishedAt: new Date().toISOString(),
  };
}

function simpleDigest(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
