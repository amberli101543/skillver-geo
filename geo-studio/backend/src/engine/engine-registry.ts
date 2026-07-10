import { Injectable, OnModuleInit } from "@nestjs/common";
import { EngineConnector } from "./engine-connector";
import { CHAT_ENGINE_VENDORS } from "./connectors/chat-engine-vendors";
import { OpenAiCompatEngineConnector } from "./connectors/openai-compat-engine-connector";
import {
  PERPLEXITY_ENGINE_ID,
  PerplexityEngineConnector,
} from "./connectors/perplexity-engine-connector";
import { ProxyEngineConnector } from "./proxy-engine-connector";

export interface EngineConnectorCapability {
  id: string;
  name: string;
  description: string;
  modes: Array<"stub" | "live">;
  envKeys: string[];
}

export class EngineConnectorNotFoundError extends Error {
  constructor(public readonly engineId: string) {
    super(`engine connector not found: ${engineId}`);
    this.name = "EngineConnectorNotFoundError";
  }
}

export const DEFAULT_ENGINE_ID = "openai-proxy";

export function parseDiagnosticEngineIds(): string[] | undefined {
  const raw = process.env.DIAGNOSTIC_ENGINE_IDS?.trim();
  if (!raw) {
    return undefined;
  }
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
}

export function diagnosticBatchConcurrency(): number {
  const v = Number(process.env.DIAGNOSTIC_BATCH_CONCURRENCY ?? 2);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 2;
}

@Injectable()
export class EngineRegistry implements OnModuleInit {
  private readonly entries = new Map<
    string,
    { capability: EngineConnectorCapability; connector: EngineConnector }
  >();

  constructor(
    private readonly proxyEngine: ProxyEngineConnector,
    private readonly perplexityEngine: PerplexityEngineConnector,
  ) {}

  onModuleInit(): void {
    this.register(
      {
        id: DEFAULT_ENGINE_ID,
        name: "OpenAI 代理引擎",
        description: "通过 OpenAI Chat Completions 模拟 GEO 诊断引擎回答；无 Key 或 ENGINE_MODE=stub 时走 stub。",
        modes: ["stub", "live"],
        envKeys: ["OPENAI_API_KEY", "ENGINE_MODE"],
      },
      this.proxyEngine,
    );
    this.register(
      {
        id: PERPLEXITY_ENGINE_ID,
        name: "Perplexity 搜索引擎",
        description: "调用 Perplexity Sonar API 获取带引用的实时回答；无 PERPLEXITY_API_KEY 或 PERPLEXITY_MODE=stub 时走 stub。",
        modes: ["stub", "live"],
        envKeys: ["PERPLEXITY_API_KEY", "PERPLEXITY_MODEL", "PERPLEXITY_MODE"],
      },
      this.perplexityEngine,
    );
    for (const vendor of CHAT_ENGINE_VENDORS) {
      this.register(
        {
          id: vendor.id,
          name: vendor.name,
          description: vendor.description,
          modes: ["stub", "live"],
          envKeys: [
            `${vendor.envPrefix}_API_KEY`,
            `${vendor.envPrefix}_MODEL`,
            `${vendor.envPrefix}_BASE_URL`,
            `${vendor.envPrefix}_MODE`,
          ],
        },
        new OpenAiCompatEngineConnector(vendor),
      );
    }
  }

  register(capability: EngineConnectorCapability, connector: EngineConnector): void {
    this.entries.set(capability.id, { capability, connector });
  }

  getDefaultId(): string {
    return process.env.ENGINE_ID?.trim() || DEFAULT_ENGINE_ID;
  }

  resolve(engineId?: string): EngineConnector {
    const id = engineId?.trim() || this.getDefaultId();
    const entry = this.entries.get(id);
    if (!entry) {
      throw new EngineConnectorNotFoundError(id);
    }
    return entry.connector;
  }

  listCapabilities(): EngineConnectorCapability[] {
    return [...this.entries.values()].map((e) => ({ ...e.capability }));
  }

  resolveBatchEngineIds(requested?: string[]): string[] {
    if (requested?.length) {
      const ids = [...new Set(requested.map((id) => id.trim()).filter(Boolean))];
      for (const id of ids) {
        this.resolve(id);
      }
      return ids;
    }
    const envIds = parseDiagnosticEngineIds();
    if (envIds?.length) {
      for (const id of envIds) {
        this.resolve(id);
      }
      return envIds;
    }
    return this.listCapabilities().map((c) => c.id);
  }
}

@Injectable()
export class RegisteredEngineConnector extends EngineConnector {
  constructor(private readonly registry: EngineRegistry) {
    super();
  }

  async run(question: string) {
    return this.registry.resolve().run(question);
  }
}
