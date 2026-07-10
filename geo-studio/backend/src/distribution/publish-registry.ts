import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  PublishConnector,
  PublishConnectorError,
  buildExportManuscript,
  stubApiPublish,
  type PublishConnectorResult,
  type PublishContext,
} from "./publish-connector";

export interface PublishConnectorCapability {
  id: string;
  name: string;
  channelTypes: string[];
  description: string;
  modes: Array<"stub" | "live">;
  envKeys: string[];
}

@Injectable()
export class ExportPublishConnector extends PublishConnector {
  async publish(ctx: PublishContext): Promise<PublishConnectorResult> {
    return {
      mode: "export",
      channel: ctx.source.name,
      export: buildExportManuscript(ctx),
    };
  }
}

@Injectable()
export class CmsApiPublishConnector extends PublishConnector {
  async publish(ctx: PublishContext): Promise<PublishConnectorResult> {
    const apiUrl = process.env.CMS_API_URL?.trim();
    const apiKey = process.env.CMS_API_KEY?.trim();
    if (!apiUrl || !apiKey) {
      return stubApiPublish(ctx);
    }

    const timeoutMs = Number(process.env.CMS_API_TIMEOUT_MS ?? 15000);
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 15000);
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          title: ctx.cell.title,
          body: ctx.draft.body,
          status: "publish",
          metadata: {
            brandId: ctx.brand.id,
            brandName: ctx.brand.name,
            cellId: ctx.cell.id,
            draftId: ctx.draft.id,
            draftVersion: ctx.draft.version,
            sourceId: ctx.source.id,
            sourceName: ctx.source.name,
          },
        }),
      });
      if (!res.ok) {
        throw new PublishConnectorError(`CMS publish failed (${res.status})`);
      }
      const payload = (await res.json()) as { url?: unknown; id?: unknown };
      const externalUrl =
        typeof payload.url === "string" && payload.url.trim()
          ? payload.url.trim()
          : typeof payload.id === "string" && payload.id.trim()
            ? `${apiUrl.replace(/\/$/, "")}/posts/${payload.id.trim()}`
            : null;
      if (!externalUrl) {
        throw new PublishConnectorError("CMS response missing url or id");
      }
      return {
        mode: "api",
        externalUrl,
        channel: ctx.source.name,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof PublishConnectorError) {
        throw err;
      }
      throw new PublishConnectorError("CMS publish request failed");
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

export class PublishChannelNotSupportedError extends Error {
  constructor(public readonly channelType: string) {
    super(`publish connector not registered for channel type: ${channelType}`);
    this.name = "PublishChannelNotSupportedError";
  }
}

@Injectable()
export class PublishRegistry implements OnModuleInit {
  private readonly byChannel = new Map<string, PublishConnector>();
  private readonly capabilities: PublishConnectorCapability[] = [];

  constructor(
    private readonly exportConnector: ExportPublishConnector,
    private readonly cmsConnector: CmsApiPublishConnector,
  ) {}

  onModuleInit(): void {
    this.register(
      {
        id: "export-manuscript",
        name: "导出稿件",
        channelTypes: ["export", "manual"],
        description: "无官方 API 的渠道生成 Markdown 发布稿，人工分发。",
        modes: ["live"],
        envKeys: [],
      },
      this.exportConnector,
      ["export", "manual"],
    );
    this.register(
      {
        id: "cms-rest",
        name: "CMS REST 发布",
        channelTypes: ["api"],
        description: "向自有 CMS REST API 发帖；未配置 CMS_API_URL/KEY 时 stub。",
        modes: ["stub", "live"],
        envKeys: ["CMS_API_URL", "CMS_API_KEY", "CMS_API_TIMEOUT_MS"],
      },
      this.cmsConnector,
      ["api"],
    );
  }

  register(
    capability: PublishConnectorCapability,
    connector: PublishConnector,
    channelTypes: string[],
  ): void {
    this.capabilities.push(capability);
    for (const channelType of channelTypes) {
      this.byChannel.set(channelType, connector);
    }
  }

  resolve(channelType: string): PublishConnector {
    const connector = this.byChannel.get(channelType);
    if (!connector) {
      throw new PublishChannelNotSupportedError(channelType);
    }
    return connector;
  }

  listCapabilities(): PublishConnectorCapability[] {
    return this.capabilities.map((c) => ({ ...c }));
  }
}

@Injectable()
export class RegisteredPublishConnector extends PublishConnector {
  constructor(private readonly registry: PublishRegistry) {
    super();
  }

  async publish(ctx: PublishContext): Promise<PublishConnectorResult> {
    return this.registry.resolve(ctx.source.channelType).publish(ctx);
  }
}
