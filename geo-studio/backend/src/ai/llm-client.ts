import { chatCompletionJson, type ChatMessage } from "./llm-router";

export type { ChatMessage };

export async function requestChatJson<T>(
  messages: ChatMessage[],
  options?: { temperature?: number },
): Promise<T | null> {
  return chatCompletionJson<T>(messages, options);
}
