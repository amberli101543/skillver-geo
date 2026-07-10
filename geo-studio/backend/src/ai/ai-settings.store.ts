export type ContentRuntimeMode = "stub" | "live";

export type LlmProviderId = "openai" | "anthropic";

export interface ModelProfile {
  id: string;
  label: string;
  model: string;
  provider?: LlmProviderId | null;
  apiKey?: string | null;
}

export interface AiSettingsOverrides {
  engineMode: "stub" | "live" | null;
  scoringMode: "rule" | "llm" | null;
  contentMode: ContentRuntimeMode | null;
  openAiModel: string | null;
  openAiApiKey: string | null;
  modelCatalog: ModelProfile[];
  promptVersions: PromptVersionOverrides;
}

export interface PromptVersionOverrides {
  engine: string | null;
  scoring: string | null;
  content: string | null;
}

let overrides: AiSettingsOverrides = {
  engineMode: null,
  scoringMode: null,
  contentMode: null,
  openAiModel: null,
  openAiApiKey: null,
  modelCatalog: [],
  promptVersions: { engine: null, scoring: null, content: null },
};

export function getAiSettingsOverrides(): AiSettingsOverrides {
  return overrides;
}

export function setAiSettingsOverrides(next: AiSettingsOverrides): void {
  overrides = next;
}
