import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  fetchDiagnosticRunDetail,
  fetchDiagnosticRuns,
  fetchQuestions,
  formatDateTime,
  formatPct,
  SENTIMENT_LABELS,
  type DiagnosticQuestion,
  type DiagnosticRunDetail,
  type DiagnosticRunItem,
  type DiagnosticRunSummary,
} from "./api";

interface DiagnosticRunsPanelProps {
  brandId: string;
  refreshKey?: number;
  selectedRunId?: string | null;
  onSelectRunId?: (runId: string | null) => void;
  scoringMode?: "rule" | "llm";
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-pill">
      <span className="metric-pill-label">{label}</span>
      <span className="metric-pill-value">{value}</span>
    </div>
  );
}

function ScoreBadge({ mentioned, sentiment }: { mentioned: boolean; sentiment: string }) {
  return (
    <span className={`badge ${mentioned ? "badge-ok" : "badge-warn"}`}>
      {mentioned ? "已提及" : "未提及"} · {SENTIMENT_LABELS[sentiment as keyof typeof SENTIMENT_LABELS] ?? sentiment}
    </span>
  );
}

function CredibilityBadge({ credibility }: { credibility: DiagnosticRunSummary["credibility"] }) {
  const className =
    credibility.level === "business-ready"
      ? "badge badge-ok credibility-badge"
      : credibility.level === "partial"
        ? "badge badge-neutral credibility-badge"
        : "badge badge-warn credibility-badge";
  const title = credibility.reasons.join("；");
  return (
    <span className={className} title={title}>
      {credibility.label}
    </span>
  );
}

function CredibilityReasons({ credibility }: { credibility: DiagnosticRunSummary["credibility"] }) {
  if (credibility.reasons.length === 0) {
    return null;
  }
  return (
    <ul className="credibility-reasons compact">
      {credibility.reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  );
}

function QuestionRow({ item, expanded, onToggle }: { item: DiagnosticRunItem; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={item.question.category === "comparison" ? "row-comparison" : undefined}>
        <td data-label="类型">{CATEGORY_LABELS[item.question.category] ?? item.question.category}</td>
        <td className="question-cell" data-label="问题">{item.question.text}</td>
        <td data-label="引擎">
          <span className="badge badge-neutral">{item.engineTest.engineId}</span>
        </td>
        <td data-label="评分">
          <ScoreBadge mentioned={item.score.mentioned} sentiment={item.score.sentiment} />
        </td>
        <td data-label="准确性">{formatPct(item.score.accuracy)}</td>
        <td data-label="信源">{item.score.sourcesCount}</td>
        <td data-label="">
          <button type="button" className="btn-link" onClick={onToggle}>
            {expanded ? "收起" : item.scoreAdvice ? "答案·建议" : "答案"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="answer-row">
          <td colSpan={7}>
            <p className="answer-text">{item.engineTest.answer}</p>
            {item.scoreAdvice && (
              <div className="score-advice-block">
                <p className="score-advice-title">
                  改写建议
                  {item.scoreAdvice.issues.length > 0 && (
                    <span className="score-advice-issues">
                      {item.scoreAdvice.issues.join(" · ")}
                    </span>
                  )}
                </p>
                <ol className="score-advice-list">
                  {item.scoreAdvice.actions.map((action) => (
                    <li key={`${action.category}-${action.suggestion.slice(0, 32)}`}>
                      {action.suggestion}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function RunDetailView({
  detail,
  scoringMode,
}: {
  detail: DiagnosticRunDetail;
  scoringMode?: "rule" | "llm";
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const comparisonItems = detail.items.filter((i) => i.question.category === "comparison");
  const otherItems = detail.items.filter((i) => i.question.category !== "comparison");

  return (
    <div className="run-detail">
      <div className="run-detail-header">
        <CredibilityBadge credibility={detail.credibility} />
        {scoringMode && (
          <p className="muted compact scoring-hint">
            本跑批评分模式（快照）：
            <span className={`badge ${scoringMode === "llm" ? "badge-ok" : "badge-neutral"}`}>
              {scoringMode === "llm" ? "LLM" : "规则"}
            </span>
          </p>
        )}
      </div>
      <CredibilityReasons credibility={detail.credibility} />
      <div className="metric-pills">
        <MetricPill label="题数" value={String(detail.baseline.questionCount)} />
        <MetricPill label="提及率" value={formatPct(detail.baseline.mentionRate)} />
        <MetricPill label="正面率" value={formatPct(detail.baseline.positiveRate)} />
        <MetricPill label="准确性" value={formatPct(detail.baseline.avgAccuracy)} />
      </div>

      {comparisonItems.length > 0 && (
        <div className="detail-block">
          <h3>竞品对标</h3>
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>问题</th>
                <th>引擎</th>
                <th>评分</th>
                <th>准确性</th>
                <th>信源</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {comparisonItems.map((item) => (
                <QuestionRow
                  key={item.engineTest.id}
                  item={item}
                  expanded={expandedId === item.engineTest.id}
                  onToggle={() =>
                    setExpandedId((id) => (id === item.engineTest.id ? null : item.engineTest.id))
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="detail-block">
        <h3>全部题目</h3>
        <table className="data-table responsive-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>问题</th>
              <th>引擎</th>
              <th>评分</th>
              <th>准确性</th>
              <th>信源</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {otherItems.map((item) => (
              <QuestionRow
                key={item.engineTest.id}
                item={item}
                expanded={expandedId === item.engineTest.id}
                onToggle={() =>
                  setExpandedId((id) => (id === item.engineTest.id ? null : item.engineTest.id))
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function resolveScoringMode(
  stored?: string,
  fallback?: "rule" | "llm",
): "rule" | "llm" | undefined {
  if (stored === "llm" || stored === "rule") return stored;
  return fallback;
}

export function DiagnosticRunsPanel({
  brandId,
  refreshKey = 0,
  selectedRunId,
  onSelectRunId,
  scoringMode: currentScoringMode,
}: DiagnosticRunsPanelProps) {
  const [runs, setRuns] = useState<DiagnosticRunSummary[]>([]);
  const [detail, setDetail] = useState<DiagnosticRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const skipNextQuestionRefreshRef = useRef(false);

  const loadRuns = useCallback(async () => {
    if (!brandId) {
      setRuns([]);
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRuns(await fetchDiagnosticRuns(brandId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载跑批历史失败");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const loadDetail = useCallback(
    async (runId: string) => {
      if (!brandId) return;
      setDetailLoading(true);
      setError(null);
      try {
        setDetail(await fetchDiagnosticRunDetail(brandId, runId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载跑批明细失败");
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [brandId],
  );

  useEffect(() => {
    void loadRuns();
  }, [loadRuns, refreshKey]);

  useEffect(() => {
    if (selectedRunId) {
      void loadDetail(selectedRunId);
    } else {
      setDetail(null);
    }
  }, [selectedRunId, loadDetail]);

  function selectRun(runId: string) {
    onSelectRunId?.(runId);
  }

  const loadQuestions = useCallback(async (): Promise<boolean> => {
    if (!brandId) return false;
    setQuestionsLoading(true);
    setError(null);
    try {
      setQuestions(await fetchQuestions(brandId));
      return true;
    } catch (e) {
      setQuestions([]);
      setError(e instanceof Error ? e.message : "加载问题集失败");
      return false;
    } finally {
      setQuestionsLoading(false);
    }
  }, [brandId]);

  async function toggleQuestions() {
    if (showQuestions) {
      setShowQuestions(false);
      return;
    }
    const ok = await loadQuestions();
    if (ok) {
      skipNextQuestionRefreshRef.current = true;
      setShowQuestions(true);
    }
  }

  useEffect(() => {
    if (!showQuestions) return;
    if (skipNextQuestionRefreshRef.current) {
      skipNextQuestionRefreshRef.current = false;
      return;
    }
    void loadQuestions();
  }, [showQuestions, loadQuestions]);

  return (
    <section id="section-runs" className="card">
      <div className="section-header">
        <h2 className="section-title">跑批历史</h2>
        <div className="btn-row">
          <button type="button" className="btn-secondary btn-sm" onClick={() => void toggleQuestions()} disabled={!brandId || questionsLoading}>
            {questionsLoading ? "加载中…" : showQuestions ? "收起问题集" : "问题集预览"}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void loadRuns()} disabled={loading || !brandId}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>

      {error && <p className="error compact">{error}</p>}

      {showQuestions && (
        <div className="detail-block questions-preview">
          <h3>诊断问题集 ({questions.length})</h3>
          {questions.length === 0 ? (
            <p className="muted compact">暂无问题</p>
          ) : (
            <ul className="question-preview-list">
              {questions.map((q, i) => (
                <li key={`${q.category}-${i}`}>
                  <span className="badge badge-neutral">{CATEGORY_LABELS[q.category] ?? q.category}</span>
                  {q.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? (
        <p className="muted compact">加载历史…</p>
      ) : runs.length === 0 ? (
        <p className="muted compact">暂无跑批记录，点击「一键诊断跑批」开始</p>
      ) : (
        <ul className="run-list">
          {runs.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className={`run-list-item ${selectedRunId === run.id ? "active" : ""}`}
                onClick={() => selectRun(run.id)}
              >
                <span className="run-list-date">{formatDateTime(run.capturedAt)}</span>
                <span className="run-list-meta">
                  <CredibilityBadge credibility={run.credibility} />
                  {run.questionCount} 题
                  {run.metrics.mention_rate !== undefined && ` · 提及 ${formatPct(run.metrics.mention_rate)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedRunId && (
        <div className="run-detail-wrap">
          {detailLoading ? (
            <p className="muted compact">加载明细…</p>
          ) : detail ? (
            <RunDetailView
              detail={detail}
              scoringMode={resolveScoringMode(detail.scoringMode, currentScoringMode)}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
