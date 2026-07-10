import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchJobStats,
  formatDateTime,
  JOB_QUEUE_MODE_LABELS,
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type JobRecord,
  type JobStats,
} from "./api";

const DEFAULT_POLL_MS = 10_000;

function resolvePollIntervalMs(): number {
  const raw = Number(import.meta.env.VITE_JOB_STATS_POLL_MS ?? DEFAULT_POLL_MS);
  return Number.isFinite(raw) && raw >= 3_000 ? raw : DEFAULT_POLL_MS;
}

function StatusBadge({ status }: { status: JobRecord["status"] }) {
  const className =
    status === "completed"
      ? "badge badge-ok"
      : status === "failed"
        ? "badge badge-warn"
        : status === "running"
          ? "badge badge-neutral"
          : "badge badge-neutral";
  return <span className={className}>{JOB_STATUS_LABELS[status]}</span>;
}

function CountCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`job-stat-card ${tone ?? ""}`.trim()}>
      <span className="job-stat-label">{label}</span>
      <span className="job-stat-value">{value}</span>
    </div>
  );
}

export function JobQueuePanel() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const pollMs = resolvePollIntervalMs();

  const load = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchJobStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载队列状态失败");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(timer);
  }, [load, pollMs]);

  return (
    <section id="section-jobs" className="card">
      <div className="section-header">
        <h2 className="section-title">任务队列</h2>
        <div className="btn-row">
          <button type="button" className="btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>
      <p className="muted section-desc">
        异步任务健康概览（每 {Math.round(pollMs / 1000)} 秒自动刷新）。Worker 进程与 API 分离部署时，请确保 Worker 在运行。
      </p>

      {error && <p className="error compact">{error}</p>}

      {stats ? (
        <>
          <div className="job-queue-meta">
            <span className="badge badge-neutral">
              队列模式：{JOB_QUEUE_MODE_LABELS[stats.queueMode] ?? stats.queueMode}
            </span>
            {stats.queueMode === "bullmq" && (
              <span className="muted compact">队列深度 {stats.queueDepth}</span>
            )}
            <span className="muted compact">更新于 {formatDateTime(stats.updatedAt)}</span>
          </div>

          <div className="job-stat-grid">
            <CountCard label="等待中" value={stats.counts.pending} />
            <CountCard label="执行中" value={stats.counts.running} tone="job-stat-running" />
            <CountCard label="已完成" value={stats.counts.completed} tone="job-stat-ok" />
            <CountCard label="失败" value={stats.counts.failed} tone="job-stat-failed" />
          </div>

          <div className="detail-block">
            <h3>最近任务</h3>
            {stats.recentJobs.length === 0 ? (
              <p className="muted compact">暂无任务记录</p>
            ) : (
              <table className="data-table responsive-table job-recent-table">
                <thead>
                  <tr>
                    <th>类型</th>
                    <th>状态</th>
                    <th>品牌</th>
                    <th>创建时间</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentJobs.map((job) => (
                    <tr key={job.id}>
                      <td data-label="类型">{JOB_TYPE_LABELS[job.type] ?? job.type}</td>
                      <td data-label="状态">
                        <StatusBadge status={job.status} />
                      </td>
                      <td data-label="品牌" className="mono-cell">
                        {job.brandId ? job.brandId.slice(0, 8) : "—"}
                      </td>
                      <td data-label="创建时间">{formatDateTime(job.createdAt)}</td>
                      <td data-label="备注" className="job-error-cell">
                        {job.status === "failed" && job.error ? (
                          <div className="job-failure-block">
                            {job.failureAdvice && (
                              <>
                                <p className="job-failure-summary">{job.failureAdvice.summary}</p>
                                <ul className="job-failure-actions">
                                  {job.failureAdvice.actions.map((action) => (
                                    <li key={action}>{action}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                            <span className="job-error-text" title={job.error}>
                              {job.error}
                            </span>
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : loading ? (
        <p className="muted compact">加载队列状态…</p>
      ) : null}
    </section>
  );
}
