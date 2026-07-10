import { promptVersion } from "./llm-config";

export type PromptPipelineKind = "engine" | "scoring" | "content";

const ENGINE_PROMPTS: Record<string, string> = {
  v1: 'You are a GEO evaluation engine. Reply in strict JSON: {"answer": string, "sources": [{"url": string, "title"?: string}]}.',
  v2: 'You are a GEO evaluation engine focused on factual, citation-ready answers. Reply in strict JSON: {"answer": string, "sources": [{"url": string, "title"?: string}]}. Prefer concise Chinese when the question is in Chinese; cite plausible public URLs in sources.',
};

const SCORING_PROMPTS: Record<string, string> = {
  v1: 'You score GEO engine answers. Reply strict JSON: {"mentioned": boolean, "mentionPosition": number|null, "sentiment": "positive"|"neutral"|"negative", "accuracy": number between 0 and 1}. accuracy reflects factual alignment with brand definition.',
  v2: 'You score GEO engine answers with strict brand-alignment checks. Reply strict JSON: {"mentioned": boolean, "mentionPosition": number|null, "sentiment": "positive"|"neutral"|"negative", "accuracy": number between 0 and 1}. Penalize hallucinations and missing brand context.',
};

const CONTENT_PROMPTS: Record<string, string> = {
  v1: 'You write GEO-friendly content in Chinese. Reply strict JSON: {"body": string}. Body uses markdown, conclusion-first, structured lists, and marks missing data as [数据占位].',
  v2: 'You write GEO-friendly content in Chinese optimized for AI citation. Reply strict JSON: {"body": string}. Lead with a direct conclusion, use numbered lists for evidence, keep paragraphs short, and mark missing data as [数据占位].',
};

const REGISTRIES: Record<PromptPipelineKind, Record<string, string>> = {
  engine: ENGINE_PROMPTS,
  scoring: SCORING_PROMPTS,
  content: CONTENT_PROMPTS,
};

export function engineSystemPrompt(version = promptVersion("engine")): string {
  return ENGINE_PROMPTS[version] ?? ENGINE_PROMPTS.v1!;
}

export function scoringSystemPrompt(version = promptVersion("scoring")): string {
  return SCORING_PROMPTS[version] ?? SCORING_PROMPTS.v1!;
}

export function contentSystemPrompt(version = promptVersion("content")): string {
  return CONTENT_PROMPTS[version] ?? CONTENT_PROMPTS.v1!;
}

function resolvePromptVersion(version: string, registry: Record<string, string>): string {
  return registry[version] ? version : "v1";
}

export function listAvailablePromptVersions(): Record<PromptPipelineKind, string[]> {
  return {
    engine: Object.keys(ENGINE_PROMPTS),
    scoring: Object.keys(SCORING_PROMPTS),
    content: Object.keys(CONTENT_PROMPTS),
  };
}

export function getPromptPreview(kind: PromptPipelineKind, version: string): string {
  const registry = REGISTRIES[kind];
  return registry[version] ?? registry.v1 ?? "";
}

export function listPromptVersions(): Record<PromptPipelineKind, string> {
  const engine = promptVersion("engine");
  const scoring = promptVersion("scoring");
  const content = promptVersion("content");
  return {
    engine: resolvePromptVersion(engine, ENGINE_PROMPTS),
    scoring: resolvePromptVersion(scoring, SCORING_PROMPTS),
    content: resolvePromptVersion(content, CONTENT_PROMPTS),
  };
}

export function listPromptCatalog(): {
  active: Record<PromptPipelineKind, string>;
  available: Record<PromptPipelineKind, string[]>;
} {
  return {
    active: listPromptVersions(),
    available: listAvailablePromptVersions(),
  };
}
