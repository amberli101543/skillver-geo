import { getAiSettingsOverrides, type ContentRuntimeMode } from "./ai-settings.store";

export type EngineRuntimeMode = "stub" | "live";
export type ScoringRuntimeMode = "rule" | "llm";

export function resolveOpenAiApiKey(): string | undefined {
  const override = getAiSettingsOverrides().openAiApiKey?.trim();
  if (override) return override;
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function isOpenAiConfigured(): boolean {
  if (resolveOpenAiApiKey()) return true;
  if (process.env.ANTHROPIC_API_KEY?.trim()) return true;
  return getAiSettingsOverrides().modelCatalog.some((item) => item.apiKey?.trim());
}

export function isOpenAiKeyPresent(): boolean {
  return Boolean(resolveOpenAiApiKey());
}

export function isAnthropicConfigured(): boolean {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return true;
  return getAiSettingsOverrides().modelCatalog.some(
    (item) => item.provider === "anthropic" && item.apiKey?.trim(),
  );
}

export function resolveEngineMode(): EngineRuntimeMode {
  const override = getAiSettingsOverrides().engineMode;
  if (override === "stub" || override === "live") return override;

  const forced = process.env.ENGINE_MODE?.trim() ?? process.env.AI_MODE?.trim();
  if (forced === "stub") return "stub";
  if (forced === "live") return isOpenAiConfigured() ? "live" : "stub";
  return isOpenAiConfigured() ? "live" : "stub";
}

export function resolveScoringMode(): ScoringRuntimeMode {
  const override = getAiSettingsOverrides().scoringMode;
  if (override === "rule" || override === "llm") {
    return override === "llm" && !isOpenAiConfigured() ? "rule" : override;
  }

  const mode = process.env.SCORING_MODE?.trim();
  if (mode === "rule") return "rule";
  if (mode === "llm") return isOpenAiConfigured() ? "llm" : "rule";
  return isOpenAiConfigured() ? "llm" : "rule";
}

export function resolveContentMode(): ContentRuntimeMode {
  const override = getAiSettingsOverrides().contentMode;
  if (override === "stub" || override === "live") {
    return override === "live" && !isOpenAiConfigured() ? "stub" : override;
  }

  const mode = process.env.CONTENT_MODE?.trim();
  if (mode === "stub") return "stub";
  if (mode === "live") return isOpenAiConfigured() ? "live" : "stub";
  return isOpenAiConfigured() ? "live" : "stub";
}

export function openAiModel(): string {
  return (
    getAiSettingsOverrides().openAiModel?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export function openAiEmbeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
}

export function openAiTimeoutMs(): number {
  const value = Number(process.env.OPENAI_TIMEOUT_MS ?? 15000);
  return Number.isFinite(value) ? value : 15000;
}

export function promptVersion(kind: "engine" | "scoring" | "content"): string {
  const stored = getAiSettingsOverrides().promptVersions[kind]?.trim();
  if (stored) return stored;

  const envKey =
    kind === "engine"
      ? "ENGINE_PROMPT_VERSION"
      : kind === "scoring"
        ? "SCORING_PROMPT_VERSION"
        : "CONTENT_PROMPT_VERSION";
  return process.env[envKey]?.trim() || "v1";
}
