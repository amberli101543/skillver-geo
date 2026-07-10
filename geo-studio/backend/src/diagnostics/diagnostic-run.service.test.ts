import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandService } from "../brand/brand-service";
import { BrandEntityService } from "../brand/brand-entity.service";
import { DiagnosticRunRepository, type DiagnosticRunDetail } from "./diagnostic-run-types";
import { DEMO_RUN_CREDIBILITY } from "./diagnostic-credibility.test-helper";
import { DiagnosticRunService } from "./diagnostic-run.service";

class FakeRunRepository extends DiagnosticRunRepository {
  detail: DiagnosticRunDetail | null = null;

  async persistFullRun() {
    return { diagnosticRunId: "run1", snapshots: [] };
  }

  async listByBrand() {
    return [];
  }

  async getById(_brandId: string, runId: string) {
    return this.detail && this.detail.id === runId ? this.detail : null;
  }
}

describe("DiagnosticRunService.get scoreAdvice enrichment", () => {
  let runs: FakeRunRepository;
  let service: DiagnosticRunService;

  beforeEach(() => {
    runs = new FakeRunRepository();
    const brands = {
      get: vi.fn(async () => ({
        id: "brand_1",
        name: "Acme",
        definition: "项目管理 SaaS",
        positioning: "最易上手",
      })),
    } as unknown as BrandService;
    const entities = {
      listAssertions: vi.fn(async () => [{ id: "a1", brandId: "brand_1", text: "支持敏捷看板" }]),
    } as unknown as BrandEntityService;
    service = new DiagnosticRunService(runs, brands, entities);
    runs.detail = {
      id: "run1",
      brandId: "brand_1",
      questionCount: 1,
      capturedAt: "2026-06-13T00:00:00.000Z",
      metrics: {},
      credibility: DEMO_RUN_CREDIBILITY,
      baseline: {
        questionCount: 1,
        mentionRate: 0,
        positiveRate: 0,
        avgAccuracy: 0.2,
        sentimentBreakdown: { positive: 0, neutral: 1, negative: 0 },
      },
      items: [
        {
          question: {
            id: "q1",
            brandId: "brand_1",
            diagnosticRunId: "run1",
            category: "brand",
            text: "Acme 怎么样？",
          },
          engineTest: {
            id: "et1",
            questionId: "q1",
            engineId: "stub",
            answer: "有一些工具",
            sources: [],
            runAt: "2026-06-13T00:00:00.000Z",
          },
          score: {
            id: "sc1",
            engineTestId: "et1",
            mentioned: false,
            mentionPosition: null,
            sentiment: "neutral",
            accuracy: 0.2,
            sourcesCount: 0,
          },
        },
      ],
    };
  });

  it("attaches scoreAdvice to low-score items", async () => {
    const detail = await service.get("brand_1", "run1");
    expect(detail?.items[0]?.scoreAdvice).toBeDefined();
    expect(detail?.items[0]?.scoreAdvice?.issues).toContain("未提及品牌");
    expect(detail?.items[0]?.scoreAdvice?.actions.length).toBeGreaterThan(0);
  });
});
