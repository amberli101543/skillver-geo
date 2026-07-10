import { Injectable, OnModuleInit } from "@nestjs/common";
import { getAiStatus, type AiStatus } from "./ai-status";
import { AiSettingsRepository } from "./ai-settings.repository";
import {
  getAiSettingsOverrides,
  setAiSettingsOverrides,
  type AiSettingsOverrides,
  type LlmProviderId,
  type ModelProfile,
  type PromptVersionOverrides,
} from "./ai-settings.store";
import { activeLlmProvider, LLM_PROVIDERS } from "./llm-router";
import {
  getPromptPreview,
  listAvailablePromptVersions,
  listPromptCatalog,
  listPromptVersions,
  type PromptPipelineKind,
} from "./prompt-registry";

export interface ModelProfileView {
  id: string;
  label: string;
  model: string;
  provider: LlmProviderId;
  hasApiKey: boolean;
}

export interface PromptVersionView {
  engine: string;
  scoring: string;
  content: string;
}

export interface PromptCatalogView {
  active: PromptVersionView;
  available: Record<PromptPipelineKind, string[]>;
  previews: Record<PromptPipelineKind, Record<string, string>>;
}

export interface AiSettingsView {
  engineMode: "stub" | "live" | null;
  scoringMode: "rule" | "llm" | null;
  contentMode: "stub" | "live" | null;
  openAiModel: string | null;
  llmProvider: LlmProviderId | null;
  availableProviders: Array<{ id: LlmProviderId; label: string; defaultModel: string }>;
  modelCatalog: ModelProfileView[];
  promptVersions: PromptVersionView;
  availablePromptVersions: Record<PromptPipelineKind, string[]>;
  hasOpenAiKey: boolean;
  openAiKeyMasked: string | null;
  runtime: AiStatus;
}

@Injectable()
export class AiSettingsService implements OnModuleInit {
  constructor(private readonly repo: AiSettingsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    setAiSettingsOverrides(await this.repo.load());
  }

  getPromptCatalog(): PromptCatalogView {
    const catalog = listPromptCatalog();
    const available = listAvailablePromptVersions();
    return {
      active: catalog.active,
      available,
      previews: {
        engine: Object.fromEntries(available.engine.map((v) => [v, getPromptPreview("engine", v)])),
        scoring: Object.fromEntries(available.scoring.map((v) => [v, getPromptPreview("scoring", v)])),
        content: Object.fromEntries(available.content.map((v) => [v, getPromptPreview("content", v)])),
      },
    };
  }

  getView(): AiSettingsView {
    const overrides = getAiSettingsOverrides();
    const activePrompts = listPromptVersions();
    return {
      engineMode: overrides.engineMode,
      scoringMode: overrides.scoringMode,
      contentMode: overrides.contentMode,
      openAiModel: overrides.openAiModel,
      llmProvider: activeLlmProvider(),
      availableProviders: LLM_PROVIDERS.map((item) => ({
        id: item.id,
        label: item.label,
        defaultModel: item.defaultModel,
      })),
      modelCatalog: overrides.modelCatalog.map((item) => ({
        id: item.id,
        label: item.label,
        model: item.model,
        provider: item.provider === "anthropic" ? "anthropic" : "openai",
        hasApiKey: Boolean(item.apiKey?.trim()),
      })),
      promptVersions: activePrompts,
      availablePromptVersions: listAvailablePromptVersions(),
      hasOpenAiKey: Boolean(overrides.openAiApiKey || process.env.OPENAI_API_KEY?.trim()),
      openAiKeyMasked: maskApiKey(overrides.openAiApiKey || process.env.OPENAI_API_KEY),
      runtime: getAiStatus(),
    };
  }

  async update(patch: Partial<AiSettingsOverrides>): Promise<AiSettingsView> {
    const normalized: Partial<AiSettingsOverrides> = { ...patch };
    if (
      patch.modelCatalog !== undefined ||
      patch.openAiModel !== undefined ||
      patch.openAiApiKey !== undefined
    ) {
      normalized.engineMode = "live";
      normalized.scoringMode = "llm";
      normalized.contentMode = "live";
    }
    if (normalized.openAiApiKey !== undefined) {
      const trimmed = normalized.openAiApiKey?.trim();
      normalized.openAiApiKey = trimmed ? trimmed : null;
    }
    if (normalized.openAiModel !== undefined) {
      const trimmed = normalized.openAiModel?.trim();
      normalized.openAiModel = trimmed ? trimmed : null;
    }
    if (normalized.modelCatalog !== undefined) {
      const current = getAiSettingsOverrides().modelCatalog;
      normalized.modelCatalog = mergeModelCatalog(current, normalized.modelCatalog);
      const active =
        normalized.modelCatalog.find((item) => item.model === normalized.openAiModel) ??
        normalized.modelCatalog[0];
      if (active) {
        normalized.openAiModel = active.model;
        if (active.apiKey?.trim()) {
          normalized.openAiApiKey = active.apiKey.trim();
        }
      }
    }
    if (normalized.promptVersions !== undefined) {
      normalized.promptVersions = normalizePromptVersions(normalized.promptVersions);
    }
    setAiSettingsOverrides(await this.repo.save(normalized));
    return this.getView();
  }
}

function normalizePromptVersions(input: PromptVersionOverrides): PromptVersionOverrides {
  const available = listAvailablePromptVersions();
  const pick = (kind: PromptPipelineKind, value: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return available[kind].includes(trimmed) ? trimmed : null;
  };
  return {
    engine: pick("engine", input.engine),
    scoring: pick("scoring", input.scoring),
    content: pick("content", input.content),
  };
}

function mergeModelCatalog(current: ModelProfile[], incoming: ModelProfile[]): ModelProfile[] {
  const seen = new Set<string>();
  const rows: ModelProfile[] = [];
  for (const item of incoming) {
    const model = item.model?.trim();
    if (!model || seen.has(model)) continue;
    seen.add(model);
    const prev = current.find((row) => row.id === item.id || row.model === model);
    const apiKey = item.apiKey?.trim() || prev?.apiKey?.trim() || null;
    rows.push({
      id: item.id?.trim() || prev?.id || `model_${rows.length + 1}`,
      label: item.label?.trim() || model,
      model,
      provider: item.provider === "anthropic" ? "anthropic" : prev?.provider === "anthropic" ? "anthropic" : "openai",
      ...(apiKey ? { apiKey } : {}),
    });
  }
  return rows;
}

function maskApiKey(key: string | null | undefined): string | null {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return "••••••••";
  return `${"•".repeat(Math.max(8, trimmed.length - 4))}${trimmed.slice(-4)}`;
}
