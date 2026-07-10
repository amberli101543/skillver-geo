import { type Assertion } from "../brand/assertion";
import { type Brand } from "../brand/brand";
import { type BaselineSummary } from "../diagnostics/baseline";
import { type DiagnosticRunItemRecord } from "../diagnostics/diagnostic-run-types";
import { type PublishRecord } from "../distribution/publish-record";
import {
  type AlertInput,
  type AlertSeverity,
  type AlertThresholdConfig,
} from "./alert";

export interface AlertDetectionContext {
  brand: Brand;
  diagnosticRunId: string;
  baseline: BaselineSummary;
  previousMentionRate?: number;
  items: DiagnosticRunItemRecord[];
  assertions: Assertion[];
  publishRecords: PublishRecord[];
  thresholds: AlertThresholdConfig;
}

export function detectAlerts(ctx: AlertDetectionContext): AlertInput[] {
  return [
    ...detectMisinformationAlerts(ctx),
    ...detectThresholdAlerts(ctx),
    ...detectMetricDropAlerts(ctx),
  ];
}

function detectMisinformationAlerts(ctx: AlertDetectionContext): AlertInput[] {
  const alerts: AlertInput[] = [];
  for (const item of ctx.items) {
    const { score, question, engineTest } = item;
    if (!score.mentioned) continue;

    const sourceHint = buildSourceHint(engineTest.sources, ctx.publishRecords);
    const base = {
      brandId: ctx.brand.id,
      type: "misinformation" as const,
      status: "open" as const,
      diagnosticRunId: ctx.diagnosticRunId,
      questionId: question.id,
    };

    if (score.sentiment === "negative") {
      alerts.push({
        ...base,
        severity: "critical",
        title: "负面表述告警",
        message: `问题「${truncate(question.text, 48)}」出现负面情感。${sourceHint}`,
      });
      continue;
    }

    if (score.accuracy < ctx.thresholds.itemAccuracyMin) {
      alerts.push({
        ...base,
        severity: score.accuracy < 0.3 ? "critical" : "warn",
        title: "低准确性告警",
        message: `问题「${truncate(question.text, 48)}」准确性 ${pct(score.accuracy)}，低于阈值 ${pct(ctx.thresholds.itemAccuracyMin)}。${sourceHint}`,
        metric: "item_accuracy",
        metricValue: score.accuracy,
        threshold: ctx.thresholds.itemAccuracyMin,
      });
      continue;
    }

    const missingAssertions = findMissingAssertions(ctx.assertions, question.text, engineTest.answer);
    // Reduce noisy false positives: only alert when multiple relevant assertions are all missing.
    if (missingAssertions.length >= 2) {
      alerts.push({
        ...base,
        severity: "warn",
        title: "断言未覆盖告警",
        message: `问题「${truncate(question.text, 48)}」未体现品牌断言：${missingAssertions
          .slice(0, 2)
          .map((a) => truncate(a.text, 24))
          .join("；")}。${sourceHint}`,
      });
    }
  }
  return alerts;
}

function detectThresholdAlerts(ctx: AlertDetectionContext): AlertInput[] {
  const alerts: AlertInput[] = [];
  const checks: Array<{
    metric: string;
    value: number;
    threshold: number;
    title: string;
    severity: AlertSeverity;
  }> = [
    {
      metric: "mention_rate",
      value: ctx.baseline.mentionRate,
      threshold: ctx.thresholds.mentionRateMin,
      title: "提及率低于阈值",
      severity: ctx.baseline.mentionRate < ctx.thresholds.mentionRateMin * 0.5 ? "critical" : "warn",
    },
    {
      metric: "avg_accuracy",
      value: ctx.baseline.avgAccuracy,
      threshold: ctx.thresholds.avgAccuracyMin,
      title: "平均准确性低于阈值",
      severity: ctx.baseline.avgAccuracy < ctx.thresholds.avgAccuracyMin * 0.5 ? "critical" : "warn",
    },
  ];

  for (const check of checks) {
    if (check.value >= check.threshold) continue;
    alerts.push({
      brandId: ctx.brand.id,
      type: "threshold",
      severity: check.severity,
      title: check.title,
      message: `${check.title}：当前 ${pct(check.value)}，阈值 ${pct(check.threshold)}。`,
      status: "open",
      diagnosticRunId: ctx.diagnosticRunId,
      metric: check.metric,
      metricValue: check.value,
      threshold: check.threshold,
    });
  }
  return alerts;
}

function detectMetricDropAlerts(ctx: AlertDetectionContext): AlertInput[] {
  if (ctx.previousMentionRate === undefined) return [];
  const drop = ctx.previousMentionRate - ctx.baseline.mentionRate;
  if (drop < ctx.thresholds.mentionDropMax) return [];
  return [
    {
      brandId: ctx.brand.id,
      type: "metric_drop",
      severity: drop >= ctx.thresholds.mentionDropMax * 2 ? "critical" : "warn",
      title: "提及率显著下跌",
      message: `提及率从 ${pct(ctx.previousMentionRate)} 降至 ${pct(ctx.baseline.mentionRate)}（跌幅 ${pct(drop)}）。`,
      status: "open",
      diagnosticRunId: ctx.diagnosticRunId,
      metric: "mention_rate",
      metricValue: ctx.baseline.mentionRate,
      threshold: ctx.previousMentionRate - ctx.thresholds.mentionDropMax,
    },
  ];
}

function findMissingAssertions(assertions: Assertion[], question: string, answer: string): Assertion[] {
  if (assertions.length === 0) return [];
  const relevantAssertions = pickRelevantAssertions(assertions, question);
  if (relevantAssertions.length < 2) return [];
  const normalizedAnswer = answer.toLowerCase();
  return relevantAssertions.filter((assertion) => {
    const snippet = assertion.text.trim().slice(0, Math.min(12, assertion.text.trim().length));
    if (snippet.length < 4) return false;
    return !normalizedAnswer.includes(snippet.toLowerCase());
  });
}

function pickRelevantAssertions(assertions: Assertion[], question: string): Assertion[] {
  if (assertions.length <= 3) return assertions;
  const normalizedQuestion = question.toLowerCase();
  const matched = assertions.filter((assertion) => {
    const snippet = assertion.text.trim().slice(0, Math.min(8, assertion.text.trim().length));
    return snippet.length >= 2 && normalizedQuestion.includes(snippet.toLowerCase());
  });
  if (matched.length >= 2) {
    return matched.slice(0, 3);
  }
  return assertions.slice(0, 3);
}

function buildSourceHint(
  sources: Array<{ url: string; title?: string }>,
  publishRecords: PublishRecord[],
): string {
  const matched = publishRecords.filter((record) => {
    if (!record.externalUrl) return false;
    const recordHost = extractHost(record.externalUrl);
    if (!recordHost) return false;
    return sources.some((source) => {
      const sourceHost = extractHost(source.url);
      return sourceHost !== null && sourceHost === recordHost;
    });
  });
  if (matched.length === 0) return "";
  const channels = [...new Set(matched.map((r) => r.channel))];
  return `疑似关联已发布渠道：${channels.join("、")}。`;
}

function extractHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
