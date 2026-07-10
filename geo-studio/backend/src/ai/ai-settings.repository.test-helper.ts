import { Injectable } from "@nestjs/common";
import { type AiSettingsOverrides } from "./ai-settings.store";

@Injectable()
export class InMemoryAiSettingsRepository {
  private row: AiSettingsOverrides = {
    engineMode: null,
    scoringMode: null,
    contentMode: null,
    openAiModel: null,
    openAiApiKey: null,
    modelCatalog: [],
    promptVersions: { engine: null, scoring: null, content: null },
  };

  async load(): Promise<AiSettingsOverrides> {
    return { ...this.row, modelCatalog: [...this.row.modelCatalog], promptVersions: { ...this.row.promptVersions } };
  }

  async save(patch: Partial<AiSettingsOverrides>): Promise<AiSettingsOverrides> {
    this.row = {
      engineMode: patch.engineMode !== undefined ? patch.engineMode : this.row.engineMode,
      scoringMode: patch.scoringMode !== undefined ? patch.scoringMode : this.row.scoringMode,
      contentMode: patch.contentMode !== undefined ? patch.contentMode : this.row.contentMode,
      openAiModel: patch.openAiModel !== undefined ? patch.openAiModel : this.row.openAiModel,
      openAiApiKey: patch.openAiApiKey !== undefined ? patch.openAiApiKey : this.row.openAiApiKey,
      modelCatalog: patch.modelCatalog !== undefined ? patch.modelCatalog : this.row.modelCatalog,
      promptVersions: patch.promptVersions !== undefined ? patch.promptVersions : this.row.promptVersions,
    };
    return this.load();
  }
}
