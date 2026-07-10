import { describe, expect, it } from "vitest";
import { type Brand } from "../brand/brand";
import { type Assertion } from "../brand/assertion";
import { type DiagnosticRunItemRecord } from "../diagnostics/diagnostic-run-types";
import { detectAlerts } from "./alert-detector";
import { defaultAlertThresholds } from "./alert";

const brand: Brand = {
  id: "b1",
  name: "Acme",
  definition: "项目管理 SaaS",
};

const thresholds = defaultAlertThresholds();

function item(partial: Partial<DiagnosticRunItemRecord> & Pick<DiagnosticRunItemRecord, "score">): DiagnosticRunItemRecord {
  return {
    question: {
      id: "q1",
      brandId: "b1",
      diagnosticRunId: "run1",
      category: "brand",
      text: "Acme 是什么？",
    },
    engineTest: {
      id: "et1",
      questionId: "q1",
      engineId: "stub",
      answer: partial.engineTest?.answer ?? "Acme 不推荐，体验差。",
      sources: partial.engineTest?.sources ?? [{ url: "https://blog.example.com/post" }],
      runAt: "2026-06-12T00:00:00.000Z",
    },
    score: partial.score,
  };
}

describe("detectAlerts", () => {
  it("flags negative sentiment as critical misinformation", () => {
    const alerts = detectAlerts({
      brand,
      diagnosticRunId: "run1",
      baseline: {
        questionCount: 1,
        mentionRate: 1,
        positiveRate: 0,
        avgAccuracy: 0.5,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 1 },
      },
      items: [
        item({
          score: {
            id: "s1",
            engineTestId: "et1",
            mentioned: true,
            mentionPosition: 0,
            sentiment: "negative",
            accuracy: 0.5,
            sourcesCount: 1,
          },
        }),
      ],
      assertions: [],
      publishRecords: [
        {
          id: "p1",
          brandId: "b1",
          contentDraftId: "d1",
          channel: "官网博客",
          externalUrl: "https://blog.example.com/a",
          publishedAt: "2026-06-11T00:00:00.000Z",
          createdAt: "2026-06-11T00:00:00.000Z",
        },
      ],
      thresholds,
    });
    expect(alerts.some((a) => a.type === "misinformation" && a.severity === "critical")).toBe(true);
    expect(alerts[0]?.message).toContain("官网博客");
  });

  it("flags threshold breach for low mention rate", () => {
    const alerts = detectAlerts({
      brand,
      diagnosticRunId: "run1",
      baseline: {
        questionCount: 2,
        mentionRate: 0.2,
        positiveRate: 0.5,
        avgAccuracy: 0.7,
        sentimentBreakdown: { positive: 1, neutral: 1, negative: 0 },
      },
      items: [],
      assertions: [],
      publishRecords: [],
      thresholds,
    });
    expect(alerts.some((a) => a.type === "threshold" && a.metric === "mention_rate")).toBe(true);
  });

  it("flags metric drop when mention rate falls", () => {
    const alerts = detectAlerts({
      brand,
      diagnosticRunId: "run2",
      previousMentionRate: 0.8,
      baseline: {
        questionCount: 2,
        mentionRate: 0.5,
        positiveRate: 0.5,
        avgAccuracy: 0.7,
        sentimentBreakdown: { positive: 1, neutral: 1, negative: 0 },
      },
      items: [],
      assertions: [],
      publishRecords: [],
      thresholds,
    });
    expect(alerts.some((a) => a.type === "metric_drop")).toBe(true);
  });

  it("flags missing assertion coverage when multiple core assertions are absent", () => {
    const assertions: Assertion[] = [
      { id: "a1", brandId: "b1", text: "支持企业级 SSO 单点登录" },
      { id: "a2", brandId: "b1", text: "可私有化部署与合规审计" },
    ];
    const alerts = detectAlerts({
      brand,
      diagnosticRunId: "run1",
      baseline: {
        questionCount: 1,
        mentionRate: 1,
        positiveRate: 1,
        avgAccuracy: 0.8,
        sentimentBreakdown: { positive: 1, neutral: 0, negative: 0 },
      },
      items: [
        item({
          engineTest: {
            id: "et1",
            questionId: "q1",
            engineId: "stub",
            answer: "Acme 是项目管理 SaaS。",
            sources: [],
            runAt: "2026-06-12T00:00:00.000Z",
          },
          score: {
            id: "s1",
            engineTestId: "et1",
            mentioned: true,
            mentionPosition: 0,
            sentiment: "positive",
            accuracy: 0.8,
            sourcesCount: 0,
          },
        }),
      ],
      assertions,
      publishRecords: [],
      thresholds,
    });
    expect(alerts.some((a) => a.title === "断言未覆盖告警")).toBe(true);
  });

  it("does not alert assertion coverage for only one missing assertion", () => {
    const assertions: Assertion[] = [{ id: "a1", brandId: "b1", text: "支持企业级 SSO 单点登录" }];
    const alerts = detectAlerts({
      brand,
      diagnosticRunId: "run1",
      baseline: {
        questionCount: 1,
        mentionRate: 1,
        positiveRate: 1,
        avgAccuracy: 0.8,
        sentimentBreakdown: { positive: 1, neutral: 0, negative: 0 },
      },
      items: [
        item({
          engineTest: {
            id: "et1",
            questionId: "q1",
            engineId: "stub",
            answer: "Acme 是项目管理 SaaS。",
            sources: [],
            runAt: "2026-06-12T00:00:00.000Z",
          },
          score: {
            id: "s1",
            engineTestId: "et1",
            mentioned: true,
            mentionPosition: 0,
            sentiment: "positive",
            accuracy: 0.8,
            sourcesCount: 0,
          },
        }),
      ],
      assertions,
      publishRecords: [],
      thresholds,
    });
    expect(alerts.some((a) => a.title === "断言未覆盖告警")).toBe(false);
  });
});
