import { useEffect, useState, type FormEvent } from "react";
import {
  fetchEngineCapabilities,
  formatDateTime,
  formatPct,
  runEngineTest,
  SENTIMENT_LABELS,
  type EngineCapability,
  type EngineTestResult,
} from "./api";
import { RagSnippetsPanel } from "./RagSnippetsPanel";

interface EngineTestPanelProps {
  brandId: string;
}

export function EngineTestPanel({ brandId }: EngineTestPanelProps) {
  const [question, setQuestion] = useState("");
  const [engines, setEngines] = useState<EngineCapability[]>([]);
  const [engineId, setEngineId] = useState("");
  const [result, setResult] = useState<EngineTestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchEngineCapabilities()
      .then((list) => {
        setEngines(list);
        setEngineId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => {
        setEngines([]);
        setEngineId("");
      });
  }, []);

  async function handleRun(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !brandId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runEngineTest(brandId, trimmed, engineId || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "试跑失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">单题引擎试跑</h2>
      <p className="muted section-desc">输入一个问题，异步试跑引擎并查看回答、信源与评分（不写入跑批历史）。</p>

      <form className="inline-form engine-test-form" onSubmit={(e) => void handleRun(e)}>
        {engines.length > 0 && (
          <label className="engine-test-engine-select">
            <span className="sr-only">引擎</span>
            <select
              value={engineId}
              onChange={(e) => setEngineId(e.target.value)}
              disabled={!brandId || running}
              aria-label="选择引擎"
            >
              {engines.map((engine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：Acme 是什么？"
          disabled={!brandId || running}
          className="engine-test-input"
        />
        <button type="submit" className="btn-accent" disabled={!brandId || running || !question.trim()}>
          {running ? "试跑中…" : "试跑"}
        </button>
      </form>

      {error && <p className="error compact">{error}</p>}

      {result && (
        <div className="engine-result">
          <div className="metric-pills">
            <div className="metric-pill">
              <span className="metric-pill-label">引擎</span>
              <span className="metric-pill-value">{result.engineId}</span>
            </div>
            <div className="metric-pill">
              <span className="metric-pill-label">提及</span>
              <span className="metric-pill-value">{result.score.mentioned ? "是" : "否"}</span>
            </div>
            <div className="metric-pill">
              <span className="metric-pill-label">情感</span>
              <span className="metric-pill-value">{SENTIMENT_LABELS[result.score.sentiment]}</span>
            </div>
            <div className="metric-pill">
              <span className="metric-pill-label">准确性</span>
              <span className="metric-pill-value">{formatPct(result.score.accuracy)}</span>
            </div>
            <div className="metric-pill">
              <span className="metric-pill-label">信源</span>
              <span className="metric-pill-value">{result.score.sourcesCount}</span>
            </div>
          </div>
          <p className="muted compact">{formatDateTime(result.runAt)}</p>
          <RagSnippetsPanel snippets={result.score.ragSnippets ?? []} title="评分 RAG 引用" />
          <p className="answer-text">{result.answer}</p>
          {result.sources.length > 0 && (
            <ul className="source-list">
              {result.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title ?? s.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
