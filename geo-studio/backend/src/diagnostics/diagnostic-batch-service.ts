import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { resolveScoringMode } from "../ai/llm-config";
import { BrandService } from "../brand/brand-service";
import { diagnosticBatchConcurrency, EngineRegistry } from "../engine/engine-registry";
import { EngineTestService, type EngineTestWithScore } from "../engine/engine-test-service";
import { ScoringService } from "../scoring/scoring-service";
import { AlertService } from "../alert/alert.service";
import { type MetricSnapshotRecord } from "../metrics/metric-types";
import { computeBaseline, type BaselineSummary } from "./baseline";
import { BrandNotFoundError, DiagnosticService, type DiagnosticQuestion } from "./diagnostic-service";
import { DiagnosticRunRepository } from "./diagnostic-run-types";
import { type GenerateOptions } from "./question";

export interface DiagnosticBatchItem {
  question: DiagnosticQuestion;
  engineTest: EngineTestWithScore;
}

export interface DiagnosticBatchResult {
  brandId: string;
  diagnosticRunId?: string;
  runAt: string;
  items: DiagnosticBatchItem[];
  baseline: BaselineSummary;
  snapshots?: MetricSnapshotRecord[];
}

interface BatchTask {
  question: DiagnosticQuestion;
  engineId: string;
}

@Injectable()
export class DiagnosticBatchService {
  private readonly logger = new Logger(DiagnosticBatchService.name);

  constructor(
    private readonly brands: BrandService,
    private readonly diagnostics: DiagnosticService,
    private readonly engineTests: EngineTestService,
    private readonly scoring: ScoringService,
    private readonly runs: DiagnosticRunRepository,
    private readonly registry: EngineRegistry,
    @Inject(forwardRef(() => AlertService))
    private readonly alerts: AlertService,
  ) {}

  async runBatch(brandId: string, opts: GenerateOptions = {}): Promise<DiagnosticBatchResult> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundError(brandId);
    }
    const questions = await this.diagnostics.buildQuestionSet(brandId, opts);
    const engineIds = this.registry.resolveBatchEngineIds(opts.engineIds);
    const tasks: BatchTask[] = questions.flatMap((question) =>
      engineIds.map((engineId) => ({ question, engineId })),
    );
    const concurrency = diagnosticBatchConcurrency();
    const items = await runWithConcurrency(tasks, concurrency, async ({ question, engineId }) => {
      const result = await this.engineTests.run(question.text, engineId);
      return {
        question,
        engineTest: { ...result, score: await this.scoring.score(brand, result) },
      };
    });
    const baseline = computeBaseline(items.map((i) => i.engineTest.score));
    baseline.questionCount = questions.length;
    return {
      brandId: brand.id,
      runAt: new Date().toISOString(),
      items,
      baseline,
    };
  }

  async runAndPersist(brandId: string, opts: GenerateOptions = {}): Promise<DiagnosticBatchResult> {
    const result = await this.runBatch(brandId, opts);
    const persisted = await this.runs.persistFullRun({
      brandId,
      capturedAt: new Date(result.runAt),
      baseline: result.baseline,
      items: result.items,
      scoringMode: resolveScoringMode(),
    });
    if (persisted.diagnosticRunId) {
      try {
        await this.alerts.evaluateAfterRun(brandId, persisted.diagnosticRunId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `alert evaluation failed for brand ${brandId} run ${persisted.diagnosticRunId}: ${message}`,
        );
      }
    }
    return {
      ...result,
      diagnosticRunId: persisted.diagnosticRunId,
      snapshots: persisted.snapshots,
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await fn(items[index]!);
    }
  }
  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
