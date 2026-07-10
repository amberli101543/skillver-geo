import { getAiSettingsOverrides, type ModelProfile } from "./ai-settings.store";
import { openAiModel, openAiTimeoutMs, resolveOpenAiApiKey } from "./llm-config";

export type LlmProviderId = "openai" | "anthropic";

export interface LlmProviderInfo {
  id: LlmProviderId;
  label: string;
  defaultModel: string;
}

export const LLM_PROVIDERS: LlmProviderInfo[] = [
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-3-5-haiku-latest" },
];

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface LlmRoute {
  provider: LlmProviderId;
  model: string;
  apiKey: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
}

function providerInfo(id: LlmProviderId): LlmProviderInfo {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0]!;
}

export function normalizeProvider(value: unknown): LlmProviderId {
  return value === "anthropic" ? "anthropic" : "openai";
}

export function resolveAnthropicApiKey(profile?: ModelProfile | null): string | undefined {
  const fromProfile = profile?.apiKey?.trim();
  if (fromProfile) return fromProfile;
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

export function routeFromProfile(profile: ModelProfile): LlmRoute | null {
  const provider = normalizeProvider(profile.provider);
  const model = profile.model.trim();
  if (!model) return null;

  const apiKey =
    provider === "anthropic" ? resolveAnthropicApiKey(profile) : profile.apiKey?.trim() || resolveOpenAiApiKey();
  if (!apiKey) return null;

  return { provider, model, apiKey };
}

export function resolveLlmRoute(): LlmRoute | null {
  const overrides = getAiSettingsOverrides();
  const activeModel = overrides.openAiModel?.trim() || openAiModel();
  const catalog = overrides.modelCatalog;

  const activeProfile =
    catalog.find((item) => item.model === activeModel) ??
    (activeModel
      ? ({
          id: "env-default",
          label: activeModel,
          model: activeModel,
          provider: "openai",
          apiKey: overrides.openAiApiKey ?? resolveOpenAiApiKey() ?? null,
        } satisfies ModelProfile)
      : null);

  if (activeProfile) {
    const route = routeFromProfile(activeProfile);
    if (route) return route;
  }

  const openAiKey = resolveOpenAiApiKey();
  if (openAiKey) {
    return { provider: "openai", model: activeModel, apiKey: openAiKey };
  }

  const anthropicKey = resolveAnthropicApiKey();
  if (anthropicKey) {
    return {
      provider: "anthropic",
      model: providerInfo("anthropic").defaultModel,
      apiKey: anthropicKey,
    };
  }

  return null;
}

export function listFallbackRoutes(primary: LlmRoute): LlmRoute[] {
  const routes: LlmRoute[] = [primary];
  const seen = new Set<string>([`${primary.provider}:${primary.model}`]);

  for (const profile of getAiSettingsOverrides().modelCatalog) {
    const route = routeFromProfile(profile);
    if (!route) continue;
    const key = `${route.provider}:${route.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push(route);
  }

  return routes;
}

export function isLlmConfigured(): boolean {
  return resolveLlmRoute() !== null;
}

export function activeLlmProvider(): LlmProviderId | null {
  return resolveLlmRoute()?.provider ?? null;
}

export async function chatCompletionJson<T>(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<T | null> {
  const primary = resolveLlmRoute();
  if (!primary) return null;

  for (const route of listFallbackRoutes(primary)) {
    const result = await dispatchWithRetry(route, messages, options);
    if (result !== null) {
      try {
        return JSON.parse(result) as T;
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function dispatchWithRetry(
  route: LlmRoute,
  messages: ChatMessage[],
  options: ChatCompletionOptions,
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = await dispatchChat(route, messages, options);
    if (content) return content;
  }
  return null;
}

async function dispatchChat(
  route: LlmRoute,
  messages: ChatMessage[],
  options: ChatCompletionOptions,
): Promise<string | null> {
  if (route.provider === "anthropic") {
    return requestAnthropicChat(route, messages, options);
  }
  return requestOpenAiChat(route, messages, options);
}

async function requestOpenAiChat(
  route: LlmRoute,
  messages: ChatMessage[],
  options: ChatCompletionOptions,
): Promise<string | null> {
  const timeoutMs = openAiTimeoutMs();
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  try {
    timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${route.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: route.model,
        temperature: options.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function requestAnthropicChat(
  route: LlmRoute,
  messages: ChatMessage[],
  options: ChatCompletionOptions,
): Promise<string | null> {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const userParts = messages.filter((m) => m.role === "user").map((m) => m.content);
  const system = [
    ...systemParts,
    "You must respond with valid JSON only. Do not wrap the JSON in markdown fences.",
  ].join("\n\n");

  const timeoutMs = openAiTimeoutMs();
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  try {
    timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": route.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: route.model,
        max_tokens: 4096,
        temperature: options.temperature ?? 0.2,
        system,
        messages: userParts.map((content) => ({ role: "user", content })),
      }),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = payload.content?.find((block) => block.type === "text")?.text;
    return text?.trim() || null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
