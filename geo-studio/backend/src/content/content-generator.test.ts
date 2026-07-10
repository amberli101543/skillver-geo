import { describe, expect, it } from "vitest";
import { stubContentDraft } from "./content-generator";
import { type Brand } from "../brand/brand";
import { DEFAULT_MATRIX_AUDIENCE, DEFAULT_MATRIX_STAGE, type MatrixCell } from "../matrix/matrix-cell";

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

describe("stubContentDraft", () => {
  it("includes brand and cell context", () => {
    const body = stubContentDraft({ brand, cell, assertions: ["支持 SSO"] });
    expect(body).toContain("Acme");
    expect(body).toContain("品牌了解");
    expect(body).toContain("支持 SSO");
    expect(body).toContain("【结论】");
  });

  it("uses placeholder when no assertions", () => {
    const body = stubContentDraft({ brand, cell, assertions: [] });
    expect(body).toContain("数据占位");
  });
});
