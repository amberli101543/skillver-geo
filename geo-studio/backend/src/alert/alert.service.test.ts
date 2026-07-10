import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandService } from "../brand/brand-service";
import { BrandRepository } from "../brand/brand-repository";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import { DistributionService } from "../distribution/distribution.service";
import { AlertRepository } from "./alert.repository";
import { AlertDispatcherService } from "./alert-dispatcher.service";
import { AlertService } from "./alert.service";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import {
  DiagnosticRunRepository,
  type DiagnosticRunDetail,
  type DiagnosticRunSummary,
  type PersistDiagnosticRunInput,
  type PersistDiagnosticRunResult,
} from "../diagnostics/diagnostic-run-types";
import { DEMO_RUN_CREDIBILITY } from "../diagnostics/diagnostic-credibility.test-helper";
import {
  defaultAlertThresholds,
  type Alert,
  type AlertInput,
  type AlertStatus,
  type AlertThresholdConfig,
  type AlertThresholdUpdate,
} from "./alert";
import {
  defaultAlertNotificationConfig,
  type AlertNotificationConfig,
  type AlertNotificationUpdate,
} from "./alert-notification";

class FakeBrandRepository extends BrandRepository {
  private readonly rows: Brand[] = [];
  private seq = 0;
  async create(input: BrandInput): Promise<Brand> {
    const brand: Brand = { id: `brand_${++this.seq}`, ...input };
    this.rows.push(brand);
    return brand;
  }
  async findById(id: string): Promise<Brand | null> {
    return this.rows.find((b) => b.id === id) ?? null;
  }
  async list(): Promise<Brand[]> {
    return [...this.rows];
  }
  async update(id: string, input: BrandInput): Promise<Brand | null> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return null;
    const next = { id, ...input };
    this.rows[index] = next;
    return next;
  }
  async delete(id: string): Promise<boolean> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return false;
    this.rows.splice(index, 1);
    return true;
  }
}
class InMemoryBrandEntityRepository extends BrandEntityRepository {
  private assertions: Assertion[] = [];
  async listAssertions(brandId: string): Promise<Assertion[]> {
    return this.assertions.filter((a) => a.brandId === brandId);
  }
  async createAssertion(brandId: string, input: { text: string }): Promise<Assertion> {
    const row: Assertion = { id: `as_${this.assertions.length + 1}`, brandId, text: input.text };
    this.assertions.push(row);
    return row;
  }
  async deleteAssertion(): Promise<boolean> {
    return false;
  }
  async listCompetitors(): Promise<Competitor[]> {
    return [];
  }
  async createCompetitor(): Promise<Competitor> {
    throw new Error("not used");
  }
  async deleteCompetitor(): Promise<boolean> {
    return false;
  }
}

class InMemoryAlertRepository extends AlertRepository {
  private readonly rows: Alert[] = [];
  private thresholds = new Map<string, AlertThresholdConfig>();
  private notifications = new Map<string, AlertNotificationConfig>();
  private seq = 0;

  async listByBrand(brandId: string, status?: AlertStatus): Promise<Alert[]> {
    return this.rows.filter((r) => r.brandId === brandId && (!status || r.status === status));
  }

  async createMany(inputs: AlertInput[]): Promise<Alert[]> {
    const now = new Date().toISOString();
    const created = inputs.map((input) => {
      const row: Alert = { id: `alert_${++this.seq}`, ...input, createdAt: now, updatedAt: now };
      this.rows.push(row);
      return row;
    });
    return created;
  }

  async updateStatus(brandId: string, alertId: string, status: AlertStatus): Promise<Alert | null> {
    const row = this.rows.find((r) => r.id === alertId && r.brandId === brandId);
    if (!row) return null;
    row.status = status;
    row.updatedAt = new Date().toISOString();
    return row;
  }

  async getThresholds(brandId: string): Promise<AlertThresholdConfig> {
    return this.thresholds.get(brandId) ?? defaultAlertThresholds();
  }

  async upsertThresholds(brandId: string, input: AlertThresholdUpdate): Promise<AlertThresholdConfig> {
    const current = await this.getThresholds(brandId);
    const next = { ...current, ...input };
    this.thresholds.set(brandId, next);
    return next;
  }

  async getNotificationSettings(brandId: string): Promise<AlertNotificationConfig> {
    return this.notifications.get(brandId) ?? defaultAlertNotificationConfig();
  }

  async upsertNotificationSettings(
    brandId: string,
    input: AlertNotificationUpdate,
  ): Promise<AlertNotificationConfig> {
    const current = await this.getNotificationSettings(brandId);
    const next = { ...current, ...input };
    this.notifications.set(brandId, next);
    return next;
  }
}

class FakeDiagnosticRunRepository extends DiagnosticRunRepository {
  private detail: DiagnosticRunDetail | null = null;
  setDetail(detail: DiagnosticRunDetail) {
    this.detail = detail;
  }
  async persistFullRun(_input: PersistDiagnosticRunInput): Promise<PersistDiagnosticRunResult> {
    return { diagnosticRunId: "run1", snapshots: [] };
  }
  async listByBrand(brandId: string): Promise<DiagnosticRunSummary[]> {
    return this.detail
      ? [
          this.detail,
          {
            id: "run0",
            brandId,
            questionCount: 2,
            capturedAt: "2026-06-11T00:00:00.000Z",
            metrics: { mention_rate: 0.9 },
            credibility: DEMO_RUN_CREDIBILITY,
          },
        ]
      : [];
  }
  async getById(_brandId: string, runId: string): Promise<DiagnosticRunDetail | null> {
    return runId === "run1" ? this.detail : null;
  }
}

describe("AlertService", () => {
  let service: AlertService;
  let brandId: string;
  let runRepo: FakeDiagnosticRunRepository;
  let entityRepo: InMemoryBrandEntityRepository;

  beforeEach(async () => {
    runRepo = new FakeDiagnosticRunRepository();
    entityRepo = new InMemoryBrandEntityRepository();
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, entityRepo);
    const runs = new DiagnosticRunService(
      runRepo,
      brands,
      entities,
    );
    const distribution = {
      listPublishRecords: async () => [],
    } as unknown as DistributionService;
    service = new AlertService(
      brands,
      entities,
      runs,
      distribution,
      new InMemoryAlertRepository(),
      new AlertDispatcherService(),
    );

    const brand = await brands.create({ name: "Acme", definition: "项目管理 SaaS" });
    brandId = brand.id;

    runRepo.setDetail({
      id: "run1",
      brandId,
      questionCount: 1,
      capturedAt: "2026-06-12T00:00:00.000Z",
      metrics: { mention_rate: 0.2, avg_accuracy: 0.3 },
      baseline: {
        questionCount: 1,
        mentionRate: 0.2,
        positiveRate: 0,
        avgAccuracy: 0.3,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 1 },
      },
      items: [
        {
          question: {
            id: "q1",
            brandId,
            diagnosticRunId: "run1",
            category: "brand",
            text: "Acme 怎么样？",
          },
          engineTest: {
            id: "et1",
            questionId: "q1",
            engineId: "stub",
            answer: "Acme 体验差，不推荐。",
            sources: [],
            runAt: "2026-06-12T00:00:00.000Z",
          },
          score: {
            id: "s1",
            engineTestId: "et1",
            mentioned: true,
            mentionPosition: 0,
            sentiment: "negative",
            accuracy: 0.4,
            sourcesCount: 0,
          },
        },
      ],
      credibility: DEMO_RUN_CREDIBILITY,
    });
  });

  it("creates alerts after diagnostic run", async () => {
    const created = await service.evaluateAfterRun(brandId, "run1");
    expect(created.length).toBeGreaterThan(0);
    const listed = await service.listAlerts(brandId, "open");
    expect(listed.length).toBe(created.length);
  });

  it("updates alert status", async () => {
    const created = await service.evaluateAfterRun(brandId, "run1");
    const updated = await service.updateAlert(brandId, created[0]!.id, { status: "acknowledged" });
    expect(updated.status).toBe("acknowledged");
  });

  it("updates thresholds", async () => {
    const thresholds = await service.updateThresholds(brandId, { mentionRateMin: 0.6 });
    expect(thresholds.mentionRateMin).toBe(0.6);
  });

  it("dispatches webhook when notification settings enabled", async () => {
    await service.updateNotificationSettings(brandId, {
      webhookEnabled: true,
      webhookUrl: "https://hooks.example.com/alerts",
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    await service.evaluateAfterRun(brandId, "run1");
    expect(fetch).toHaveBeenCalled();
  });
});
