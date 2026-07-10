import { type BaselineSummary } from "./baseline";
import { type DiagnosticBatchItem } from "./diagnostic-batch-service";
import { type DiagnosticCredibility } from "./diagnostic-credibility";
import { type ScoreAdvice } from "../scoring/scoring-advice";
import { type BaselineMetric, type MetricSnapshotRecord } from "../metrics/metric-types";
import { type Sentiment, type TestScore } from "../scoring/score";

export interface EngineSourceRecord {
  url: string;
  title?: string;
}

export interface PersistDiagnosticRunInput {
  brandId: string;
  capturedAt: Date;
  baseline: BaselineSummary;
  items: DiagnosticBatchItem[];
  scoringMode?: string;
}

export interface PersistDiagnosticRunResult {
  diagnosticRunId: string;
  snapshots: MetricSnapshotRecord[];
}

export interface QuestionRecord {
  id: string;
  brandId: string;
  diagnosticRunId: string;
  category: string;
  text: string;
}

export interface EngineTestRecord {
  id: string;
  questionId: string;
  engineId: string;
  answer: string;
  sources: EngineSourceRecord[];
  runAt: string;
}

export interface TestScoreRecord extends TestScore {
  id: string;
  engineTestId: string;
}

export interface DiagnosticRunItemRecord {
  question: QuestionRecord;
  engineTest: EngineTestRecord;
  score: TestScoreRecord;
  scoreAdvice?: ScoreAdvice;
}

export interface DiagnosticRunSummary {
  id: string;
  brandId: string;
  questionCount: number;
  capturedAt: string;
  scoringMode?: string;
  metrics: Partial<Record<BaselineMetric, number>>;
  credibility: DiagnosticCredibility;
}

export interface DiagnosticRunDetail extends DiagnosticRunSummary {
  baseline: BaselineSummary;
  items: DiagnosticRunItemRecord[];
}

/** Per-engine baseline for one diagnostic run (GEO-040). */
export interface EngineRunBaselinePoint {
  diagnosticRunId: string;
  capturedAt: string;
  engineId: string;
  mentionRate: number;
  positiveRate: number;
  avgAccuracy: number;
}

export abstract class DiagnosticRunRepository {
  abstract persistFullRun(input: PersistDiagnosticRunInput): Promise<PersistDiagnosticRunResult>;
  abstract listByBrand(brandId: string): Promise<DiagnosticRunSummary[]>;
  abstract getById(brandId: string, runId: string): Promise<DiagnosticRunDetail | null>;

  listEngineBaselinesByRun(_brandId: string): Promise<EngineRunBaselinePoint[]> {
    return Promise.resolve([]);
  }
}
