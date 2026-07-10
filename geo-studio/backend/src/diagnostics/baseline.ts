import { type Sentiment, type TestScore } from "../scoring/score";

export interface BaselineSummary {
  questionCount: number;
  mentionRate: number;
  positiveRate: number;
  avgAccuracy: number;
  sentimentBreakdown: Record<Sentiment, number>;
}

export function computeBaseline(scores: TestScore[]): BaselineSummary {
  const n = scores.length;
  if (n === 0) {
    return {
      questionCount: 0,
      mentionRate: 0,
      positiveRate: 0,
      avgAccuracy: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    };
  }
  const mentioned = scores.filter((s) => s.mentioned).length;
  const positive = scores.filter((s) => s.sentiment === "positive").length;
  const avgAccuracy = scores.reduce((sum, s) => sum + s.accuracy, 0) / n;
  return {
    questionCount: n,
    mentionRate: mentioned / n,
    positiveRate: positive / n,
    avgAccuracy,
    sentimentBreakdown: {
      positive: scores.filter((s) => s.sentiment === "positive").length,
      neutral: scores.filter((s) => s.sentiment === "neutral").length,
      negative: scores.filter((s) => s.sentiment === "negative").length,
    },
  };
}
