import { Body, Controller, Get, Put } from "@nestjs/common";
import { getAiStatus, type AiStatus } from "./ai-status";
import { AiSettingsService, type AiSettingsView, type PromptCatalogView } from "./ai-settings.service";
import { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly settings: AiSettingsService) {}

  @Get("status")
  status(): AiStatus {
    return getAiStatus();
  }

  @Get("prompts")
  listPrompts(): PromptCatalogView {
    return this.settings.getPromptCatalog();
  }

  @Get("settings")
  getSettings(): AiSettingsView {
    return this.settings.getView();
  }

  @Put("settings")
  async updateSettings(@Body() dto: UpdateAiSettingsDto): Promise<AiSettingsView> {
    return this.settings.update({
      ...(dto.engineMode !== undefined ? { engineMode: dto.engineMode } : {}),
      ...(dto.scoringMode !== undefined ? { scoringMode: dto.scoringMode } : {}),
      ...(dto.contentMode !== undefined ? { contentMode: dto.contentMode } : {}),
      ...(dto.openAiModel !== undefined ? { openAiModel: dto.openAiModel } : {}),
      ...(dto.openAiApiKey !== undefined ? { openAiApiKey: dto.openAiApiKey } : {}),
      ...(dto.modelCatalog !== undefined ? { modelCatalog: dto.modelCatalog } : {}),
      ...(dto.promptVersions !== undefined
        ? {
            promptVersions: {
              engine: dto.promptVersions.engine ?? null,
              scoring: dto.promptVersions.scoring ?? null,
              content: dto.promptVersions.content ?? null,
            },
          }
        : {}),
    });
  }
}
