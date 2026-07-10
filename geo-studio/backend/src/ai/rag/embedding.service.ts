import { Injectable } from "@nestjs/common";
import { isOpenAiConfigured, openAiEmbeddingModel, openAiTimeoutMs, resolveOpenAiApiKey } from "../llm-config";

@Injectable()
export class EmbeddingService {
  async embed(text: string): Promise<number[] | null> {
    const vectors = await this.embedBatch([text]);
    return vectors[0] ?? null;
  }

  async embedBatch(texts: string[]): Promise<Array<number[] | null>> {
    if (!isOpenAiConfigured() || texts.length === 0) {
      return texts.map(() => null);
    }

    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) {
      return texts.map(() => null);
    }

    const timeoutMs = openAiTimeoutMs();
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: openAiEmbeddingModel(),
          input: texts,
        }),
      });
      if (!res.ok) {
        return texts.map(() => null);
      }

      const payload = (await res.json()) as {
        data?: Array<{ embedding?: number[]; index?: number }>;
      };
      const results: Array<number[] | null> = texts.map(() => null);
      for (const item of payload.data ?? []) {
        if (typeof item.index === "number" && Array.isArray(item.embedding)) {
          results[item.index] = item.embedding;
        }
      }
      return results;
    } catch {
      return texts.map(() => null);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
