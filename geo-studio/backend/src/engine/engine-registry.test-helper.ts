import { EngineConnector, type EngineAnswer } from "./engine-connector";
import {
  EngineConnectorNotFoundError,
  EngineRegistry,
  type EngineConnectorCapability,
} from "./engine-registry";

export function stubEngineRegistry(
  connectors: Record<string, EngineConnector>,
  options: { defaultId?: string; batchEngineIds?: string[] } = {},
): EngineRegistry {
  const defaultId = options.defaultId ?? Object.keys(connectors)[0] ?? "openai-proxy";
  const batchEngineIds = options.batchEngineIds ?? [defaultId];

  return {
    getDefaultId: () => defaultId,
    resolve: (engineId?: string) => {
      const id = engineId?.trim() || defaultId;
      const connector = connectors[id];
      if (!connector) {
        throw new EngineConnectorNotFoundError(id);
      }
      return connector;
    },
    resolveBatchEngineIds: (requested?: string[]) => {
      if (requested?.length) {
        const ids = [...new Set(requested.map((id) => id.trim()).filter(Boolean))];
        for (const id of ids) {
          if (!(id in connectors)) {
            throw new EngineConnectorNotFoundError(id);
          }
        }
        return ids;
      }
      return batchEngineIds.filter((id) => id in connectors);
    },
    listCapabilities: () =>
      Object.keys(connectors).map(
        (id): EngineConnectorCapability => ({
          id,
          name: id,
          description: "test connector",
          modes: ["stub"],
          envKeys: [],
        }),
      ),
  } as EngineRegistry;
}

export class IdTaggedEngineConnector extends EngineConnector {
  constructor(private readonly id: string) {
    super();
  }

  async run(question: string): Promise<EngineAnswer> {
    return {
      engineId: this.id,
      answer: `[${this.id}] ${question}`,
      sources: [{ url: `https://stub.local/${this.id}`, title: this.id }],
    };
  }
}
