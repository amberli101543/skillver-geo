import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { type AiSettingsOverrides, type ModelProfile, type PromptVersionOverrides } from "./ai-settings.store";

const SETTINGS_ID = "default";

@Injectable()
export class AiSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(): Promise<AiSettingsOverrides> {
    const row = await this.prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) {
      return {
        engineMode: null,
        scoringMode: null,
        contentMode: null,
        openAiModel: null,
        openAiApiKey: null,
        modelCatalog: [],
        promptVersions: emptyPromptVersions(),
      };
    }
    return {
      engineMode: parseEngineMode(row.engineMode),
      scoringMode: parseScoringMode(row.scoringMode),
      contentMode: parseContentMode(row.contentMode),
      openAiModel: row.openAiModel?.trim() || null,
      openAiApiKey: row.openAiApiKey?.trim() || null,
      modelCatalog: parseModelCatalog(row.modelCatalog),
      promptVersions: parsePromptVersions(row.promptVersions),
    };
  }

  async save(patch: Partial<AiSettingsOverrides>): Promise<AiSettingsOverrides> {
    const current = await this.load();
    const next: AiSettingsOverrides = {
      engineMode: patch.engineMode !== undefined ? patch.engineMode : current.engineMode,
      scoringMode: patch.scoringMode !== undefined ? patch.scoringMode : current.scoringMode,
      contentMode: patch.contentMode !== undefined ? patch.contentMode : current.contentMode,
      openAiModel: patch.openAiModel !== undefined ? patch.openAiModel : current.openAiModel,
      openAiApiKey: patch.openAiApiKey !== undefined ? patch.openAiApiKey : current.openAiApiKey,
      modelCatalog: patch.modelCatalog !== undefined ? patch.modelCatalog : current.modelCatalog,
      promptVersions: patch.promptVersions !== undefined ? patch.promptVersions : current.promptVersions,
    };
    await this.prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        engineMode: next.engineMode,
        scoringMode: next.scoringMode,
        contentMode: next.contentMode,
        openAiModel: next.openAiModel,
        openAiApiKey: next.openAiApiKey,
        modelCatalog: serializeModelCatalog(next.modelCatalog),
        promptVersions: serializePromptVersions(next.promptVersions),
      },
      update: {
        engineMode: next.engineMode,
        scoringMode: next.scoringMode,
        contentMode: next.contentMode,
        openAiModel: next.openAiModel,
        openAiApiKey: next.openAiApiKey,
        modelCatalog: serializeModelCatalog(next.modelCatalog),
        promptVersions: serializePromptVersions(next.promptVersions),
      },
    });
    return next;
  }
}

function parseEngineMode(value: string | null | undefined): "stub" | "live" | null {
  if (value === "stub" || value === "live") return value;
  return null;
}

function parseScoringMode(value: string | null | undefined): "rule" | "llm" | null {
  if (value === "rule" || value === "llm") return value;
  return null;
}

function parseContentMode(value: string | null | undefined): "stub" | "live" | null {
  if (value === "stub" || value === "live") return value;
  return null;
}

function parseModelCatalog(value: string | null | undefined): ModelProfile[] {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ModelProfile => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return (
          typeof row.id === "string" &&
          typeof row.label === "string" &&
          typeof row.model === "string" &&
          row.id.trim().length > 0 &&
          row.model.trim().length > 0
        );
      })
      .map((item) => {
        const row = item as unknown as Record<string, unknown>;
        const apiKey = typeof row.apiKey === "string" ? row.apiKey.trim() || null : null;
        return {
          id: item.id.trim(),
          label: item.label.trim() || item.model.trim(),
          model: item.model.trim(),
          provider: row.provider === "anthropic" ? "anthropic" : "openai",
          ...(apiKey ? { apiKey } : {}),
        };
      });
  } catch {
    return [];
  }
}

function serializeModelCatalog(catalog: ModelProfile[]): string | null {
  if (!catalog.length) return null;
  return JSON.stringify(catalog);
}

function emptyPromptVersions(): PromptVersionOverrides {
  return { engine: null, scoring: null, content: null };
}

function parsePromptVersions(value: string | null | undefined): PromptVersionOverrides {
  if (!value?.trim()) return emptyPromptVersions();
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyPromptVersions();
    const row = parsed as Record<string, unknown>;
    return {
      engine: typeof row.engine === "string" && row.engine.trim() ? row.engine.trim() : null,
      scoring: typeof row.scoring === "string" && row.scoring.trim() ? row.scoring.trim() : null,
      content: typeof row.content === "string" && row.content.trim() ? row.content.trim() : null,
    };
  } catch {
    return emptyPromptVersions();
  }
}

function serializePromptVersions(versions: PromptVersionOverrides): string | null {
  if (!versions.engine && !versions.scoring && !versions.content) return null;
  return JSON.stringify(versions);
}
