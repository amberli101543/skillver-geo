import { describe, expect, it } from "vitest";
import { type Brand } from "../brand/brand";
import { type ContentDraft } from "../content/content-draft";
import { DEFAULT_MATRIX_AUDIENCE, DEFAULT_MATRIX_STAGE, type MatrixCell } from "../matrix/matrix-cell";
import { buildExportManuscript, type PublishContext } from "./publish-connector";
import {
  CmsApiPublishConnector,
  ExportPublishConnector,
  PublishRegistry,
  RegisteredPublishConnector,
} from "./publish-registry";
import { type Source } from "./source";

const brand: Brand = {
  id: "b1",
  name: "Acme",
  definition: "项目管理 SaaS",
  positioning: "中小企业首选",
};

const cell: MatrixCell = {
  id: "c1",
  brandId: "b1",
  intent: "品牌了解",
  angle: "核心价值",
  stage: DEFAULT_MATRIX_STAGE,
  audience: DEFAULT_MATRIX_AUDIENCE,
  title: "强化叙事",
  priority: 60,
};

const draft: ContentDraft = {
  id: "d1",
  cellId: "c1",
  body: "## 正文\n\n结论前置示例。",
  status: "draft",
  version: 2,
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

const apiSource: Source = {
  id: "s1",
  name: "官网 CMS",
  tier: "owned",
  weight: 90,
  channelType: "api",
};

const exportSource: Source = {
  id: "s2",
  name: "知乎专栏",
  tier: "community",
  weight: 50,
  channelType: "export",
};

const ctx: PublishContext = { brand, cell, draft, source: exportSource };

function registryConnector(): RegisteredPublishConnector {
  const registry = new PublishRegistry(new ExportPublishConnector(), new CmsApiPublishConnector());
  registry.onModuleInit();
  return new RegisteredPublishConnector(registry);
}

describe("buildExportManuscript", () => {
  it("includes brand, cell, and draft body", () => {
    const manuscript = buildExportManuscript(ctx);
    expect(manuscript.title).toBe("强化叙事");
    expect(manuscript.filename).toBe("强化叙事-v2.md");
    expect(manuscript.body).toContain("Acme");
    expect(manuscript.body).toContain("知乎专栏");
    expect(manuscript.body).toContain("结论前置示例");
  });
});

describe("RegisteredPublishConnector", () => {
  it("returns export manuscript for export channel", async () => {
    const result = await registryConnector().publish(ctx);
    expect(result.mode).toBe("export");
    if (result.mode === "export") {
      expect(result.export.filename).toContain("v2.md");
    }
  });

  it("returns stub api publish when CMS env missing", async () => {
    const prevUrl = process.env.CMS_API_URL;
    const prevKey = process.env.CMS_API_KEY;
    delete process.env.CMS_API_URL;
    delete process.env.CMS_API_KEY;
    try {
      const result = await registryConnector().publish({ ...ctx, source: apiSource });
      expect(result.mode).toBe("api");
      if (result.mode === "api") {
        expect(result.externalUrl).toContain("stub.cms");
      }
    } finally {
      if (prevUrl !== undefined) process.env.CMS_API_URL = prevUrl;
      if (prevKey !== undefined) process.env.CMS_API_KEY = prevKey;
    }
  });
});
