import { Injectable, Optional } from "@nestjs/common";
import { requestChatJson } from "./llm-client";
import { isOpenAiConfigured, resolveContentMode } from "./llm-config";
import { contentSystemPrompt } from "./prompt-registry";
import { RagService } from "./rag/rag.service";

export interface ContentGenerateOptions {
  brandId?: string;
  ragQuery?: string;
  assertions?: string[];
}

export interface ContentGenerateResult {
  body: string | null;
  ragSnippets: string[];
}

@Injectable()
export class ContentAiFacade {
  constructor(@Optional() private readonly rag?: RagService) {}

  async generate(
    userPrompt: string,
    options: ContentGenerateOptions = {},
  ): Promise<ContentGenerateResult> {
    const ragSnippets = await this.retrieveSnippets(userPrompt, options);
    if (!isOpenAiConfigured() || resolveContentMode() === "stub") {
      return { body: null, ragSnippets };
    }

    const augmentedPrompt = userPrompt + (this.rag?.formatContext(ragSnippets) ?? "");

    const parsed = await requestChatJson<{ body?: unknown }>(
      [
        { role: "system", content: contentSystemPrompt() },
        { role: "user", content: augmentedPrompt },
      ],
      { temperature: 0.4 },
    );
    if (parsed && typeof parsed.body === "string" && parsed.body.trim()) {
      return { body: parsed.body.trim(), ragSnippets };
    }
    return { body: null, ragSnippets };
  }

  async retrieveSnippets(userPrompt: string, options: ContentGenerateOptions = {}): Promise<string[]> {
    if (!this.rag || !options.brandId) {
      return [];
    }

    if (options.assertions?.length) {
      await this.rag.syncAssertions(options.brandId, options.assertions);
    }

    const query = options.ragQuery ?? userPrompt;
    return this.rag.retrieve(options.brandId, query);
  }
}
