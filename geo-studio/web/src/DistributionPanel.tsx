import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CHANNEL_TYPE_LABELS,
  DISTRIBUTION_DIRECTION_LABELS,
  createDistributionTask,
  createPublishRecord,
  createSource,
  deleteSource,
  updateSource,
  downloadExportManuscript,
  DRAFT_STATUS_LABELS,
  executeDistributionTask,
  fetchContentDrafts,
  fetchDistributionImpact,
  fetchDistributionTasks,
  fetchPublishRecords,
  fetchSources,
  formatDateTime,
  formatPct,
  SOURCE_TIER_LABELS,
  TASK_STATUS_LABELS,
  updateDistributionTask,
  type ChannelType,
  type ContentDraft,
  type DistributionTask,
  type PublishImpactItem,
  type PublishRecord,
  type Source,
  type SourceTier,
} from "./api";

interface DistributionPanelProps {
  brandId: string;
  refreshKey?: number;
}

function StatusBadge({ status }: { status: DistributionTask["status"] }) {
  const cls =
    status === "completed"
      ? "badge badge-ok"
      : status === "failed" || status === "cancelled"
        ? "badge badge-warn"
        : "badge badge-neutral";
  return <span className={cls}>{TASK_STATUS_LABELS[status]}</span>;
}

function ImpactBadge({ impact }: { impact: PublishImpactItem }) {
  const cls =
    impact.overallDirection === "improved"
      ? "badge badge-ok"
      : impact.overallDirection === "declined"
        ? "badge badge-warn"
        : "badge badge-neutral";
  return (
    <span className={cls} title={impact.summary}>
      {DISTRIBUTION_DIRECTION_LABELS[impact.overallDirection]}
    </span>
  );
}

export function DistributionPanel({ brandId, refreshKey = 0 }: DistributionPanelProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [tasks, setTasks] = useState<DistributionTask[]>([]);
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [impactByRecordId, setImpactByRecordId] = useState<Map<string, PublishImpactItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [sourceName, setSourceName] = useState("");
  const [sourceTier, setSourceTier] = useState<SourceTier>("owned");
  const [sourceWeight, setSourceWeight] = useState("70");
  const [sourceChannel, setSourceChannel] = useState<ChannelType>("manual");
  const [addingSource, setAddingSource] = useState(false);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [editSourceName, setEditSourceName] = useState("");
  const [editSourceTier, setEditSourceTier] = useState<SourceTier>("owned");
  const [editSourceWeight, setEditSourceWeight] = useState("70");
  const [editSourceChannel, setEditSourceChannel] = useState<ChannelType>("manual");
  const [savingSourceId, setSavingSourceId] = useState<string | null>(null);

  const [taskDraftId, setTaskDraftId] = useState("");
  const [taskSourceId, setTaskSourceId] = useState("");
  const [taskPriority, setTaskPriority] = useState("50");
  const [creatingTask, setCreatingTask] = useState(false);

  const [publishUrls, setPublishUrls] = useState<Record<string, string>>({});
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const draftById = useMemo(() => new Map(drafts.map((d) => [d.id, d])), [drafts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sourceList = await fetchSources();
      setSources(sourceList);
      if (!brandId) {
        setDrafts([]);
        setTasks([]);
        setRecords([]);
        setImpactByRecordId(new Map());
        return;
      }
      const [draftList, taskList, recordList, impactRes] = await Promise.all([
        fetchContentDrafts(brandId),
        fetchDistributionTasks(brandId),
        fetchPublishRecords(brandId),
        fetchDistributionImpact(brandId),
      ]);
      setDrafts(draftList);
      setTasks(taskList);
      setRecords(recordList);
      setImpactByRecordId(new Map(impactRes.items.map((item) => [item.publishRecordId, item])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载分发数据失败");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (drafts.length > 0 && !taskDraftId) {
      setTaskDraftId(drafts[0]!.id);
    }
    if (sources.length > 0 && !taskSourceId) {
      setTaskSourceId(sources[0]!.id);
    }
  }, [drafts, sources, taskDraftId, taskSourceId]);

  async function handleAddSource(e: FormEvent) {
    e.preventDefault();
    if (!sourceName.trim()) return;
    setAddingSource(true);
    setError(null);
    setInfo(null);
    try {
      await createSource({
        name: sourceName.trim(),
        tier: sourceTier,
        weight: Number(sourceWeight) || 0,
        channelType: sourceChannel,
      });
      setSourceName("");
      setInfo("信源已添加");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加信源失败");
    } finally {
      setAddingSource(false);
    }
  }

  function startEditSource(source: Source) {
    setEditSourceId(source.id);
    setEditSourceName(source.name);
    setEditSourceTier(source.tier);
    setEditSourceWeight(String(source.weight));
    setEditSourceChannel(source.channelType);
  }

  async function handleSaveSource(sourceId: string) {
    const trimmedName = editSourceName.trim();
    if (!trimmedName) {
      setError("信源名称不能为空");
      return;
    }
    const weight = Number.parseInt(editSourceWeight, 10);
    if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
      setError("权重须在 0–100 之间");
      return;
    }
    setSavingSourceId(sourceId);
    setError(null);
    try {
      await updateSource(sourceId, {
        name: trimmedName,
        tier: editSourceTier,
        weight,
        channelType: editSourceChannel,
      });
      setEditSourceId(null);
      setInfo("信源已更新");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新信源失败");
    } finally {
      setSavingSourceId(null);
    }
  }

  async function handleRemoveSource(sourceId: string) {
    setError(null);
    try {
      await deleteSource(sourceId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除信源失败");
    }
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!brandId || !taskDraftId || !taskSourceId) return;
    setCreatingTask(true);
    setError(null);
    setInfo(null);
    try {
      await createDistributionTask(brandId, {
        contentDraftId: taskDraftId,
        sourceId: taskSourceId,
        priority: Number(taskPriority) || 0,
      });
      setInfo("分发任务已创建");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建任务失败");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleStartTask(taskId: string) {
    if (!brandId) return;
    setError(null);
    try {
      await updateDistributionTask(brandId, taskId, { status: "in_progress" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新任务失败");
    }
  }

  async function handleExecute(task: DistributionTask) {
    if (!brandId) return;
    setExecutingTaskId(task.id);
    setError(null);
    setInfo(null);
    try {
      const result = await executeDistributionTask(brandId, task.id);
      if (result.mode === "export" && result.export) {
        downloadExportManuscript(result.export);
        setInfo("稿件已导出，发布完成后可手动记录");
      } else {
        setInfo(`已自动发布${result.publishRecord?.externalUrl ? `：${result.publishRecord.externalUrl}` : ""}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "执行发布失败");
      await load();
    } finally {
      setExecutingTaskId(null);
    }
  }

  async function handlePublish(task: DistributionTask) {
    if (!brandId) return;
    const source = sourceById.get(task.sourceId);
    setPublishingTaskId(task.id);
    setError(null);
    setInfo(null);
    try {
      await createPublishRecord(brandId, {
        contentDraftId: task.contentDraftId,
        sourceId: task.sourceId,
        distributionTaskId: task.id,
        channel: source?.name ?? "未知渠道",
        externalUrl: publishUrls[task.id]?.trim() || undefined,
      });
      setInfo("发布已记录");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录发布失败");
    } finally {
      setPublishingTaskId(null);
    }
  }

  function draftLabel(draftId: string): string {
    const draft = draftById.get(draftId);
    if (!draft) return draftId.slice(0, 8);
    return `v${draft.version} · ${DRAFT_STATUS_LABELS[draft.status]}`;
  }

  return (
    <section id="section-distribution" className="card">
      <div className="section-header">
        <h2 className="section-title">信源与分发</h2>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>
      <p className="muted section-desc">
        管理信源库、创建分发任务；api 渠道可自动发布至 CMS，export/manual 渠道可导出稿件后人工发布。
      </p>

      {info && <p className="info compact">{info}</p>}
      {error && <p className="error compact">{error}</p>}

      <div className="detail-block">
        <h3>信源库</h3>
        <form className="distribution-form" onSubmit={(e) => void handleAddSource(e)}>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="信源名称"
          />
          <select value={sourceTier} onChange={(e) => setSourceTier(e.target.value as SourceTier)}>
            {(Object.keys(SOURCE_TIER_LABELS) as SourceTier[]).map((t) => (
              <option key={t} value={t}>
                {SOURCE_TIER_LABELS[t]}
              </option>
            ))}
          </select>
          <select value={sourceChannel} onChange={(e) => setSourceChannel(e.target.value as ChannelType)}>
            {(Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]).map((t) => (
              <option key={t} value={t}>
                {CHANNEL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <div className="source-weight-inline">
            <input
              type="number"
              min={0}
              max={100}
              value={sourceWeight}
              onChange={(e) => setSourceWeight(e.target.value)}
              title="分发优先级权重，数值越高越优先"
            />
            <span className="muted">权重 0–100</span>
          </div>
          <button type="submit" className="btn-secondary" disabled={addingSource || !sourceName.trim()}>
            {addingSource ? "添加中…" : "添加信源"}
          </button>
        </form>
        {sources.length === 0 ? (
          <p className="muted compact">暂无信源</p>
        ) : (
          <ul className="source-list">
            {sources.map((s) => (
              <li key={s.id} className="source-item">
                {editSourceId === s.id ? (
                  <form
                    className="distribution-form source-edit-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSaveSource(s.id);
                    }}
                  >
                    <input value={editSourceName} onChange={(e) => setEditSourceName(e.target.value)} />
                    <select value={editSourceTier} onChange={(e) => setEditSourceTier(e.target.value as SourceTier)}>
                      {(Object.keys(SOURCE_TIER_LABELS) as SourceTier[]).map((t) => (
                        <option key={t} value={t}>{SOURCE_TIER_LABELS[t]}</option>
                      ))}
                    </select>
                    <select value={editSourceChannel} onChange={(e) => setEditSourceChannel(e.target.value as ChannelType)}>
                      {(Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]).map((t) => (
                        <option key={t} value={t}>{CHANNEL_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <div className="source-weight-inline">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editSourceWeight}
                        onChange={(e) => setEditSourceWeight(e.target.value)}
                      />
                      <span className="muted">权重 0–100</span>
                    </div>
                    <button type="submit" className="btn-secondary btn-sm" disabled={savingSourceId === s.id}>
                      {savingSourceId === s.id ? "保存中…" : "保存"}
                    </button>
                    <button type="button" className="btn-link" onClick={() => setEditSourceId(null)}>取消</button>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{s.name}</strong>
                      <span className="muted source-meta">
                        {SOURCE_TIER_LABELS[s.tier]} · {CHANNEL_TYPE_LABELS[s.channelType]} · 权重 {s.weight}
                      </span>
                    </div>
                    <div className="source-item-actions">
                      <button type="button" className="btn-link btn-sm" onClick={() => startEditSource(s)}>编辑</button>
                      <button type="button" className="btn-icon" aria-label={`删除 ${s.name}`} onClick={() => void handleRemoveSource(s.id)}>
                        ×
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-block">
        <h3>分发任务</h3>
        {!brandId ? (
          <p className="muted compact">请选择品牌</p>
        ) : drafts.length === 0 ? (
          <p className="muted compact">请先在语义矩阵中生成内容初稿</p>
        ) : sources.length === 0 ? (
          <p className="muted compact">请先添加信源</p>
        ) : (
          <form className="distribution-form" onSubmit={(e) => void handleCreateTask(e)}>
            <select value={taskDraftId} onChange={(e) => setTaskDraftId(e.target.value)}>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  初稿 v{d.version} ({DRAFT_STATUS_LABELS[d.status]})
                </option>
              ))}
            </select>
            <select value={taskSourceId} onChange={(e) => setTaskSourceId(e.target.value)}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              placeholder="优先级"
            />
            <button type="submit" className="btn-accent btn-sm" disabled={creatingTask}>
              {creatingTask ? "创建中…" : "创建任务"}
            </button>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className="muted compact">暂无分发任务</p>
        ) : (
          <table className="data-table distribution-table responsive-table">
            <thead>
              <tr>
                <th>初稿</th>
                <th>信源</th>
                <th>优先级</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const source = sourceById.get(task.sourceId);
                const canPublish = task.status === "pending" || task.status === "in_progress";
                const canExecute =
                  task.status === "pending" || task.status === "in_progress" || task.status === "failed";
                const isApiChannel = source?.channelType === "api";
                const isExportChannel =
                  source?.channelType === "export" || source?.channelType === "manual";
                return (
                  <tr key={task.id}>
                    <td data-label="初稿">{draftLabel(task.contentDraftId)}</td>
                    <td data-label="信源">
                      {source?.name ?? "—"}
                      {source && (
                        <span className="muted source-meta">{CHANNEL_TYPE_LABELS[source.channelType]}</span>
                      )}
                    </td>
                    <td data-label="优先级"><span className="priority-tag">P{task.priority}</span></td>
                    <td data-label="状态"><StatusBadge status={task.status} /></td>
                    <td className="matrix-actions" data-label="操作">
                      {canExecute && isApiChannel && (
                        <button
                          type="button"
                          className="btn-accent btn-sm"
                          disabled={executingTaskId === task.id}
                          onClick={() => void handleExecute(task)}
                        >
                          {executingTaskId === task.id ? "发布中…" : "自动发布"}
                        </button>
                      )}
                      {canExecute && isExportChannel && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={executingTaskId === task.id}
                          onClick={() => void handleExecute(task)}
                        >
                          {executingTaskId === task.id ? "导出中…" : "导出稿件"}
                        </button>
                      )}
                      {task.status === "pending" && !isApiChannel && !isExportChannel && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => void handleStartTask(task.id)}>
                          开始
                        </button>
                      )}
                      {canPublish && isExportChannel && (
                        <>
                          <input
                            className="publish-url-input"
                            value={publishUrls[task.id] ?? ""}
                            onChange={(e) =>
                              setPublishUrls((prev) => ({ ...prev, [task.id]: e.target.value }))
                            }
                            placeholder="发布链接（可选）"
                          />
                          <button
                            type="button"
                            className="btn-accent btn-sm"
                            disabled={publishingTaskId === task.id}
                            onClick={() => void handlePublish(task)}
                          >
                            {publishingTaskId === task.id ? "记录中…" : "记录发布"}
                          </button>
                        </>
                      )}
                      {canPublish && !isExportChannel && !isApiChannel && (
                        <>
                          <input
                            className="publish-url-input"
                            value={publishUrls[task.id] ?? ""}
                            onChange={(e) =>
                              setPublishUrls((prev) => ({ ...prev, [task.id]: e.target.value }))
                            }
                            placeholder="发布链接（可选）"
                          />
                          <button
                            type="button"
                            className="btn-accent btn-sm"
                            disabled={publishingTaskId === task.id}
                            onClick={() => void handlePublish(task)}
                          >
                            {publishingTaskId === task.id ? "记录中…" : "记录发布"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="detail-block">
        <h3>发布记录 ({records.length})</h3>
        {records.length === 0 ? (
          <p className="muted compact">暂无发布记录</p>
        ) : (
          <ul className="publish-list">
            {records.map((r) => {
              const impact = impactByRecordId.get(r.id);
              return (
              <li key={r.id} className="publish-item">
                <div>
                  <div className="publish-item-header">
                    <strong>{r.channel}</strong>
                    {impact && <ImpactBadge impact={impact} />}
                  </div>
                  <span className="muted publish-meta">
                    {formatDateTime(r.publishedAt)} · 初稿 {draftLabel(r.contentDraftId)}
                  </span>
                  {impact && (
                    <p className="muted compact publish-impact-summary">{impact.summary}</p>
                  )}
                  {impact &&
                    impact.beforeCapturedAt &&
                    impact.afterCapturedAt &&
                    impact.metrics.mention_rate.delta !== null && (
                      <p className="publish-impact-delta compact">
                        提及率 {formatPct(impact.metrics.mention_rate.before ?? 0)} →{" "}
                        {formatPct(impact.metrics.mention_rate.after ?? 0)}
                        {impact.metrics.avg_accuracy.delta !== null && (
                          <>
                            {" "}
                            · 准确性 {formatPct(impact.metrics.avg_accuracy.before ?? 0)} →{" "}
                            {formatPct(impact.metrics.avg_accuracy.after ?? 0)}
                          </>
                        )}
                      </p>
                    )}
                  {r.externalUrl && (
                    <a className="publish-link" href={r.externalUrl} target="_blank" rel="noreferrer">
                      {r.externalUrl}
                    </a>
                  )}
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
