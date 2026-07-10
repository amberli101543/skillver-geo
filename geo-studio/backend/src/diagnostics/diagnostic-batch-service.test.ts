import { beforeEach, describe, expect, it } from "vitest";
import { BrandNotFoundError } from "./diagnostic-service";
import { DiagnosticBatchService } from "./diagnostic-batch-service";
import { DiagnosticService } from "./diagnostic-service";
import { AlertService } from "../alert/alert.service";
import { BrandService } from "../brand/brand-service";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandRepository } from "../brand/brand-repository";
import { BrandEntityRepository } from "../brand/brand-entity.repository";
import { EngineConnector, stubEngineAnswer, type EngineAnswer } from "../engine/engine-connector";
import { EngineTestService } from "../engine/engine-test-service";
import {
  IdTaggedEngineConnector,
  stubEngineRegistry,
} from "../engine/engine-registry.test-helper";
import { ScoringAiFacade } from "../ai/scoring.facade";
import { ScoringService } from "../scoring/scoring-service";
import { ProxyScoringPipeline, RuleScoringPipeline } from "../scoring/scoring-pipeline";
import {
  DiagnosticRunRepository,
  type PersistDiagnosticRunInput,
  type PersistDiagnosticRunResult,
} from "./diagnostic-run-types";
import { type Brand, type BrandInput } from "../brand/brand";
import { type Assertion, type AssertionInput } from "../brand/assertion";
import { type Competitor, type CompetitorInput } from "../brand/competitor";

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

class FakeEngineConnector extends EngineConnector {
  async run(question: string): Promise<EngineAnswer> {
    return stubEngineAnswer(question);
  }
}

class FakeDiagnosticRunRepository extends DiagnosticRunRepository {
  async persistFullRun(input: PersistDiagnosticRunInput): Promise<PersistDiagnosticRunResult> {
    return {
      diagnosticRunId: "run_1",
      snapshots: [],
    };
  }
  async listByBrand() {
    return [];
  }
  async getById() {
    return null;
  }
}

class NoopAlertService {
  async evaluateAfterRun(): Promise<never[]> {
    return [];
  }
}

class FailingAlertService {
  async evaluateAfterRun(): Promise<never[]> {
    throw new Error("alert down");
  }
}

describe("DiagnosticBatchService", () => {
  let batch: DiagnosticBatchService;
  let brandId: string;

  beforeEach(async () => {
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    const diagnostics = new DiagnosticService(brands, entities);
    const registry = stubEngineRegistry({ "openai-proxy": new FakeEngineConnector() });
    const engineTests = new EngineTestService(registry);
    const scoring = new ScoringService(new ProxyScoringPipeline(new RuleScoringPipeline(), new ScoringAiFacade()));
    batch = new DiagnosticBatchService(
      brands,
      diagnostics,
      engineTests,
      scoring,
      new FakeDiagnosticRunRepository(),
      registry,
      new NoopAlertService() as unknown as AlertService,
    );
    const brand = await brands.create({
      name: "Acme",
      definition: "项目管理 SaaS",
    });
    brandId = brand.id;
  });

  it("runs all questions and returns baseline summary", async () => {
    const result = await batch.runBatch(brandId, {
      competitors: ["Beta"],
      attributes: ["价格"],
      engineIds: ["openai-proxy"],
    });
    expect(result.brandId).toBe(brandId);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.engineTest.score !== undefined)).toBe(true);
    const uniqueQuestions = new Set(result.items.map((i) => i.question.text)).size;
    expect(result.baseline.questionCount).toBe(uniqueQuestions);
    expect(result.baseline.mentionRate).toBeGreaterThanOrEqual(0);
    expect(result.baseline.mentionRate).toBeLessThanOrEqual(1);
    expect(result.runAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("runs multiple engines per question when engineIds has >=2 entries", async () => {
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    const diagnostics = new DiagnosticService(brands, entities);
    const registry = stubEngineRegistry({
      "openai-proxy": new IdTaggedEngineConnector("openai-proxy"),
      perplexity: new IdTaggedEngineConnector("perplexity"),
    });
    const engineTests = new EngineTestService(registry);
    const scoring = new ScoringService(new ProxyScoringPipeline(new RuleScoringPipeline(), new ScoringAiFacade()));
    const multiBatch = new DiagnosticBatchService(
      brands,
      diagnostics,
      engineTests,
      scoring,
      new FakeDiagnosticRunRepository(),
      registry,
      new NoopAlertService() as unknown as AlertService,
    );
    const brand = await brands.create({ name: "Acme", definition: "项目管理 SaaS" });
    const result = await multiBatch.runBatch(brand.id, {
      engineIds: ["openai-proxy", "perplexity"],
    });
    const engineIds = new Set(result.items.map((i) => i.engineTest.engineId));
    expect(engineIds.has("openai-proxy")).toBe(true);
    expect(engineIds.has("perplexity")).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    const uniqueQuestions = new Set(result.items.map((i) => i.question.text)).size;
    expect(result.items.length).toBe(uniqueQuestions * 2);
  });

  it("runAndPersist returns diagnosticRunId", async () => {
    const result = await batch.runAndPersist(brandId, { engineIds: ["openai-proxy"] });
    expect(result.diagnosticRunId).toBe("run_1");
  });

  it("runAndPersist still succeeds when alert evaluation fails", async () => {
    const brands = new BrandService(new FakeBrandRepository());
    const entities = new BrandEntityService(brands, new InMemoryBrandEntityRepository());
    const diagnostics = new DiagnosticService(brands, entities);
    const registry = stubEngineRegistry({ "openai-proxy": new FakeEngineConnector() });
    const engineTests = new EngineTestService(registry);
    const scoring = new ScoringService(new ProxyScoringPipeline(new RuleScoringPipeline(), new ScoringAiFacade()));
    const brand = await brands.create({
      name: "Acme",
      definition: "项目管理 SaaS",
    });
    const resilientBatch = new DiagnosticBatchService(
      brands,
      diagnostics,
      engineTests,
      scoring,
      new FakeDiagnosticRunRepository(),
      registry,
      new FailingAlertService() as unknown as AlertService,
    );

    const result = await resilientBatch.runAndPersist(brand.id, { engineIds: ["openai-proxy"] });
    expect(result.diagnosticRunId).toBe("run_1");
  });

  it("throws BrandNotFoundError for unknown brand", async () => {
    await expect(batch.runBatch("missing")).rejects.toBeInstanceOf(BrandNotFoundError);
  });
});
