import {
  isOpenAiConfigured,
  openAiModel,
  resolveContentMode,
  resolveEngineMode,
  resolveScoringMode,
  type EngineRuntimeMode,
  type ScoringRuntimeMode,
} from "./llm-config";
import { type ContentRuntimeMode, type LlmProviderId } from "./ai-settings.store";
import { activeLlmProvider, listFallbackRoutes, resolveLlmRoute } from "./llm-router";
import { listPromptVersions } from "./prompt-registry";

export interface AiStatus {
  openAiConfigured: boolean;
  engineMode: EngineRuntimeMode;
  scoringMode: ScoringRuntimeMode;
  contentMode: ContentRuntimeMode;
  model: string;
  llmProvider: LlmProviderId | null;
  llmFallbackCount: number;
  promptVersions: Record<"engine" | "scoring" | "content", string>;
}

export function getAiStatus(): AiStatus {
  const route = resolveLlmRoute();
  return {
    openAiConfigured: isOpenAiConfigured(),
    engineMode: resolveEngineMode(),
    scoringMode: resolveScoringMode(),
    contentMode: resolveContentMode(),
    model: route?.model ?? openAiModel(),
    llmProvider: activeLlmProvider(),
    llmFallbackCount: route ? listFallbackRoutes(route).length : 0,
    promptVersions: listPromptVersions(),
  };
}
