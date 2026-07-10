import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandController } from "../brand/brand.controller";
import { BrandRepository } from "../brand/brand-repository";
import { BrandService } from "../brand/brand-service";
import { type Brand, type BrandInput } from "../brand/brand";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { BrandEntityService } from "../brand/brand-entity.service";
import { type Assertion } from "../brand/assertion";
import { type Competitor } from "../brand/competitor";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import {
  DiagnosticRunRepository,
  type DiagnosticRunDetail,
  type DiagnosticRunSummary,
  type PersistDiagnosticRunInput,
  type PersistDiagnosticRunResult,
} from "../diagnostics/diagnostic-run-types";
import { DEMO_RUN_CREDIBILITY } from "../diagnostics/diagnostic-credibility.test-helper";
import { DistributionService } from "../distribution/distribution.service";
import { AlertController } from "./alert.controller";
import { AlertDispatcherService } from "./alert-dispatcher.service";
import { AlertRepository } from "./alert.repository";
import { AlertService } from "./alert.service";
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
  async listAssertions(): Promise<Assertion[]> {
    return [];
  }
  async createAssertion(): Promise<Assertion> {
    throw new Error("not used");
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
  private seq = 0;
  async listByBrand(brandId: string, status?: AlertStatus): Promise<Alert[]> {
    return this.rows.filter((r) => r.brandId === brandId && (!status || r.status === status));
  }
  async createMany(inputs: AlertInput[]): Promise<Alert[]> {
    const now = new Date().toISOString();
    return inputs.map((input) => {
      const row: Alert = { id: `alert_${++this.seq}`, ...input, createdAt: now, updatedAt: now };
      this.rows.push(row);
      return row;
    });
  }
  async updateStatus(brandId: string, alertId: string, status: AlertStatus): Promise<Alert | null> {
    const row = this.rows.find((r) => r.id === alertId && r.brandId === brandId);
    if (!row) return null;
    row.status = status;
    return row;
  }
  async getThresholds(brandId: string): Promise<AlertThresholdConfig> {
    return this.thresholds.get(brandId) ?? defaultAlertThresholds();
  }
  async upsertThresholds(brandId: string, input: AlertThresholdUpdate): Promise<AlertThresholdConfig> {
    const next = { ...(await this.getThresholds(brandId)), ...input };
    this.thresholds.set(brandId, next);
    return next;
  }
  async getNotificationSettings(brandId: string): Promise<AlertNotificationConfig> {
    return defaultAlertNotificationConfig();
  }
  async upsertNotificationSettings(
    brandId: string,
    input: AlertNotificationUpdate,
  ): Promise<AlertNotificationConfig> {
    return { ...defaultAlertNotificationConfig(), ...input };
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
            questionCount: 1,
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

describe("Alert API (e2e)", () => {
  let app: INestApplication;
  let brandId: string;
  let runRepo: FakeDiagnosticRunRepository;

  beforeAll(async () => {
    runRepo = new FakeDiagnosticRunRepository();
    const moduleRef = await Test.createTestingModule({
      controllers: [BrandController, AlertController],
      providers: [
        BrandService,
        BrandEntityService,
        DiagnosticRunService,
        AlertService,
        AlertDispatcherService,
        {
          provide: DistributionService,
          useValue: { listPublishRecords: async () => [] },
        },
        { provide: BrandRepository, useClass: FakeBrandRepository },
        { provide: BrandEntityRepository, useClass: InMemoryBrandEntityRepository },
        { provide: DiagnosticRunRepository, useValue: runRepo },
        { provide: AlertRepository, useClass: InMemoryAlertRepository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const brandRes = await request(app.getHttpServer())
      .post("/brands")
      .send({ name: "Acme", definition: "SaaS" });
    brandId = brandRes.body.id;

    runRepo.setDetail({
      id: "run1",
      brandId,
      questionCount: 1,
      capturedAt: "2026-06-12T00:00:00.000Z",
      metrics: { mention_rate: 0.1, avg_accuracy: 0.2 },
      baseline: {
        questionCount: 1,
        mentionRate: 0.1,
        positiveRate: 0,
        avgAccuracy: 0.2,
        sentimentBreakdown: { positive: 0, neutral: 1, negative: 0 },
      },
      items: [],
      credibility: DEMO_RUN_CREDIBILITY,
    });

    await moduleRef.get(AlertService).evaluateAfterRun(brandId, "run1");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /alerts -> 200", async () => {
    const res = await request(app.getHttpServer()).get(`/brands/${brandId}/alerts`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("PATCH /alerts/:id -> acknowledged", async () => {
    const list = await request(app.getHttpServer()).get(`/brands/${brandId}/alerts`);
    const alertId = list.body[0].id as string;
    const res = await request(app.getHttpServer())
      .patch(`/brands/${brandId}/alerts/${alertId}`)
      .send({ status: "acknowledged" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("acknowledged");
  });

  it("PUT /alert-thresholds -> 200", async () => {
    const res = await request(app.getHttpServer())
      .put(`/brands/${brandId}/alert-thresholds`)
      .send({ mentionRateMin: 0.55 });
    expect(res.status).toBe(200);
    expect(res.body.mentionRateMin).toBe(0.55);
  });

  it("PUT /alert-notifications -> 200", async () => {
    const res = await request(app.getHttpServer())
      .put(`/brands/${brandId}/alert-notifications`)
      .send({ webhookEnabled: true, webhookUrl: "https://hooks.example.com/alerts" });
    expect(res.status).toBe(200);
    expect(res.body.webhookEnabled).toBe(true);
  });
});
