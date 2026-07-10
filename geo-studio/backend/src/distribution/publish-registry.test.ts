import { describe, expect, it } from "vitest";
import { type Brand } from "../brand/brand";
import { type ContentDraft } from "../content/content-draft";
import { DEFAULT_MATRIX_AUDIENCE, DEFAULT_MATRIX_STAGE, type MatrixCell } from "../matrix/matrix-cell";
import { buildExportManuscript, stubApiPublish, type PublishContext } from "./publish-connector";
import {
  CmsApiPublishConnector,
  ExportPublishConnector,
  PublishChannelNotSupportedError,
  PublishRegistry,
  RegisteredPublishConnector,
} from "./publish-registry";
import { type Source } from "./source";

const brand: Brand = { id: "b1", name: "Acme", definition: "SaaS" };
const cell: MatrixCell = {
  id: "c1",
  brandId: "b1",
  intent: "品牌了解",
  angle: "核心价值",
  stage: DEFAULT_MATRIX_STAGE,
  audience: DEFAULT_MATRIX_AUDIENCE,
  title: "叙事",
  priority: 1,
};
const draft: ContentDraft = {
  id: "d1",
  cellId: "c1",
  body: "正文",
  status: "draft",
  version: 1,
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

const exportSource: Source = {
  id: "s1",
  name: "知乎",
  tier: "community",
  weight: 50,
  channelType: "export",
};

const apiSource: Source = { ...exportSource, id: "s2", name: "CMS", channelType: "api" };

const exportCtx: PublishContext = { brand, cell, draft, source: exportSource };

function createRegistry(): PublishRegistry {
  const registry = new PublishRegistry(new ExportPublishConnector(), new CmsApiPublishConnector());
  registry.onModuleInit();
  return registry;
}

describe("PublishRegistry", () => {
  it("lists export and cms capabilities", () => {
    const caps = createRegistry().listCapabilities();
    expect(caps.map((c) => c.id).sort()).toEqual(["cms-rest", "export-manuscript"]);
  });

  it("routes export channel to ExportPublishConnector", async () => {
    const registry = createRegistry();
    const result = await registry.resolve("export").publish(exportCtx);
    expect(result.mode).toBe("export");
  });

  it("routes api channel to CmsApiPublishConnector stub when env missing", async () => {
    delete process.env.CMS_API_URL;
    delete process.env.CMS_API_KEY;
    const registry = createRegistry();
    const result = await registry.resolve("api").publish({ ...exportCtx, source: apiSource });
    expect(result.mode).toBe("api");
    if (result.mode === "api") {
      expect(result.externalUrl).toContain("stub.cms");
    }
  });

  it("RegisteredPublishConnector uses source channelType", async () => {
    const connector = new RegisteredPublishConnector(createRegistry());
    const result = await connector.publish(exportCtx);
    expect(result.mode).toBe("export");
    expect(buildExportManuscript(exportCtx).filename).toContain(".md");
  });

  it("throws for unsupported channel type", () => {
    expect(() => createRegistry().resolve("unknown")).toThrow(PublishChannelNotSupportedError);
  });
});

describe("stubApiPublish", () => {
  it("returns deterministic stub url", () => {
    const result = stubApiPublish({ ...exportCtx, source: apiSource });
    expect(result.externalUrl).toContain("stub.cms.geo-studio.local");
  });
});
