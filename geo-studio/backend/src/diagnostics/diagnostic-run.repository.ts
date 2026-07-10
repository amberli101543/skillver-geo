import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BASELINE_METRICS, type BaselineMetric } from "../metrics/metric-types";
import { computeBaseline } from "./baseline";
import { assessDiagnosticCredibility } from "./diagnostic-credibility";
import {
  DiagnosticRunRepository,
  type DiagnosticRunDetail,
  type DiagnosticRunItemRecord,
  type DiagnosticRunSummary,
  type EngineSourceRecord,
  type EngineRunBaselinePoint,
  type PersistDiagnosticRunInput,
  type PersistDiagnosticRunResult,
  type TestScoreRecord,
} from "./diagnostic-run-types";

function parseSources(value: unknown): EngineSourceRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((s): s is { url: string; title?: string } => typeof s?.url === "string")
    .map((s) => ({
      url: s.url,
      ...(typeof s.title === "string" ? { title: s.title } : {}),
    }));
}

function metricsFromSnapshots(
  snapshots: Array<{ metric: string; value: number }>,
): Partial<Record<BaselineMetric, number>> {
  const out: Partial<Record<BaselineMetric, number>> = {};
  for (const snap of snapshots) {
    if ((BASELINE_METRICS as readonly string[]).includes(snap.metric)) {
      out[snap.metric as BaselineMetric] = snap.value;
    }
  }
  return out;
}

function credibilityFromRun(
  scoringMode: string | null | undefined,
  questions: Array<{
    engineTests: Array<{
      engineId: string;
      answer: string;
      sources: unknown;
      score: { sourcesCount: number } | null;
    }>;
  }>,
) {
  const items = questions.flatMap((q) =>
    q.engineTests
      .filter((et): et is typeof et & { score: { sourcesCount: number } } => et.score !== null)
      .map((et) => ({
        engineTest: {
          engineId: et.engineId,
          answer: et.answer,
          sources: parseSources(et.sources),
        },
        score: { sourcesCount: et.score.sourcesCount },
      })),
  );
  return assessDiagnosticCredibility({
    ...(scoringMode ? { scoringMode } : {}),
    items,
  });
}

@Injectable()
export class PrismaDiagnosticRunRepository extends DiagnosticRunRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async persistFullRun(input: PersistDiagnosticRunInput): Promise<PersistDiagnosticRunResult> {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.diagnosticRun.create({
        data: {
          brandId: input.brandId,
          questionCount: input.baseline.questionCount,
          capturedAt: input.capturedAt,
          ...(input.scoringMode ? { scoringMode: input.scoringMode } : {}),
        },
      });

      const snapshotRows = await Promise.all(
        BASELINE_METRICS.map((metric) =>
          tx.metricSnapshot.create({
            data: {
              brandId: input.brandId,
              diagnosticRunId: run.id,
              metric,
              value: input.baseline[metricKey(metric)],
              capturedAt: input.capturedAt,
            },
          }),
        ),
      );

      const questionByKey = new Map<string, string>();

      for (const item of input.items) {
        const key = `${item.question.category}\0${item.question.text}`;
        let questionId = questionByKey.get(key);
        if (!questionId) {
          const question = await tx.question.create({
            data: {
              brandId: input.brandId,
              diagnosticRunId: run.id,
              category: item.question.category,
              text: item.question.text,
            },
          });
          questionId = question.id;
          questionByKey.set(key, questionId);
        }
        const engineTest = await tx.engineTest.create({
          data: {
            questionId,
            engineId: item.engineTest.engineId,
            answer: item.engineTest.answer,
            sources: item.engineTest.sources as object,
            runAt: new Date(item.engineTest.runAt),
          },
        });
        await tx.testScore.create({
          data: {
            engineTestId: engineTest.id,
            mentioned: item.engineTest.score.mentioned,
            mentionPosition: item.engineTest.score.mentionPosition,
            sentiment: item.engineTest.score.sentiment,
            accuracy: item.engineTest.score.accuracy,
            sourcesCount: item.engineTest.score.sourcesCount,
          },
        });
      }

      return {
        diagnosticRunId: run.id,
        snapshots: snapshotRows.map((row) => ({
          id: row.id,
          brandId: row.brandId,
          diagnosticRunId: row.diagnosticRunId,
          metric: row.metric as BaselineMetric,
          value: row.value,
          capturedAt: row.capturedAt.toISOString(),
        })),
      };
    });
  }

  async listByBrand(brandId: string): Promise<DiagnosticRunSummary[]> {
    const runs = await this.prisma.diagnosticRun.findMany({
      where: { brandId },
      orderBy: { capturedAt: "desc" },
      include: {
        metricSnapshots: true,
        questions: {
          include: {
            engineTests: { include: { score: true } },
          },
        },
      },
    });
    return runs.map((run) => ({
      id: run.id,
      brandId: run.brandId,
      questionCount: run.questionCount,
      capturedAt: run.capturedAt.toISOString(),
      ...(run.scoringMode ? { scoringMode: run.scoringMode } : {}),
      metrics: metricsFromSnapshots(run.metricSnapshots),
      credibility: credibilityFromRun(run.scoringMode, run.questions),
    }));
  }

  async listEngineBaselinesByRun(brandId: string) {
    const runs = await this.prisma.diagnosticRun.findMany({
      where: { brandId },
      orderBy: { capturedAt: "asc" },
      include: {
        questions: {
          include: {
            engineTests: { include: { score: true } },
          },
        },
      },
    });

    const points: EngineRunBaselinePoint[] = [];
    for (const run of runs) {
      const scoresByEngine = new Map<string, TestScoreRecord[]>();
      for (const question of run.questions) {
        for (const engineTest of question.engineTests) {
          if (!engineTest.score) {
            continue;
          }
          const score: TestScoreRecord = {
            id: engineTest.score.id,
            engineTestId: engineTest.score.engineTestId,
            mentioned: engineTest.score.mentioned,
            mentionPosition: engineTest.score.mentionPosition,
            sentiment: engineTest.score.sentiment as TestScoreRecord["sentiment"],
            accuracy: engineTest.score.accuracy,
            sourcesCount: engineTest.score.sourcesCount,
          };
          const bucket = scoresByEngine.get(engineTest.engineId) ?? [];
          bucket.push(score);
          scoresByEngine.set(engineTest.engineId, bucket);
        }
      }
      const capturedAt = run.capturedAt.toISOString();
      for (const [engineId, scores] of scoresByEngine) {
        const baseline = computeBaseline(scores);
        points.push({
          diagnosticRunId: run.id,
          capturedAt,
          engineId,
          mentionRate: baseline.mentionRate,
          positiveRate: baseline.positiveRate,
          avgAccuracy: baseline.avgAccuracy,
        });
      }
    }
    return points;
  }

  async getById(brandId: string, runId: string): Promise<DiagnosticRunDetail | null> {
    const run = await this.prisma.diagnosticRun.findFirst({
      where: { id: runId, brandId },
      include: {
        metricSnapshots: true,
        questions: {
          orderBy: { id: "asc" },
          include: {
            engineTests: { include: { score: true } },
          },
        },
      },
    });
    if (!run) {
      return null;
    }

    const items: DiagnosticRunItemRecord[] = [];
    for (const q of run.questions) {
      for (const engineTest of q.engineTests) {
        if (!engineTest.score) {
          continue;
        }
        const score: TestScoreRecord = {
          id: engineTest.score.id,
          engineTestId: engineTest.score.engineTestId,
          mentioned: engineTest.score.mentioned,
          mentionPosition: engineTest.score.mentionPosition,
          sentiment: engineTest.score.sentiment as TestScoreRecord["sentiment"],
          accuracy: engineTest.score.accuracy,
          sourcesCount: engineTest.score.sourcesCount,
        };
        items.push({
          question: {
            id: q.id,
            brandId: q.brandId,
            diagnosticRunId: q.diagnosticRunId,
            category: q.category,
            text: q.text,
          },
          engineTest: {
            id: engineTest.id,
            questionId: engineTest.questionId,
            engineId: engineTest.engineId,
            answer: engineTest.answer,
            sources: parseSources(engineTest.sources),
            runAt: engineTest.runAt.toISOString(),
          },
          score,
        });
      }
    }

    const metrics = metricsFromSnapshots(run.metricSnapshots);

    return {
      id: run.id,
      brandId: run.brandId,
      questionCount: run.questionCount,
      capturedAt: run.capturedAt.toISOString(),
      ...(run.scoringMode ? { scoringMode: run.scoringMode } : {}),
      metrics,
      credibility: credibilityFromRun(run.scoringMode, run.questions),
      baseline: computeBaseline(items.map((i) => i.score)),
      items,
    };
  }
}

function metricKey(metric: BaselineMetric): "mentionRate" | "positiveRate" | "avgAccuracy" {
  switch (metric) {
    case "mention_rate":
      return "mentionRate";
    case "positive_rate":
      return "positiveRate";
    case "avg_accuracy":
      return "avgAccuracy";
  }
}
