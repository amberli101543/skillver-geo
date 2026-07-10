import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  createMatrixCell,
  deleteMatrixCell,
  DRAFT_STATUS_LABELS,
  fetchAssertions,
  fetchCellContentDrafts,
  fetchContentDrafts,
  fetchMatrixCells,
  fetchMatrixGaps,
  generateContentDraft,
  syncMatrixAssertions,
  syncMatrixGaps,
  updateContentDraft,
  updateMatrixCell,
  type ContentDraft,
  type MatrixCell,
  type MatrixGap,
} from "./api";
import { DraftEditor } from "./DraftEditor";
import { MatrixDimensionField } from "./MatrixDimensionField";
import {
  MATRIX_ANGLES,
  MATRIX_AUDIENCES,
  MATRIX_INTENTS,
  MATRIX_STAGES,
} from "./matrix-dimensions";

interface MatrixPanelProps {
  brandId: string;
  refreshKey?: number;
  onDraftGenerated?: () => void;
}

export function MatrixPanel({ brandId, refreshKey = 0, onDraftGenerated }: MatrixPanelProps) {
  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [gaps, setGaps] = useState<MatrixGap[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingAssertions, setSyncingAssertions] = useState(false);
  const [generatingCellId, setGeneratingCellId] = useState<string | null>(null);
  const [expandedCellId, setExpandedCellId] = useState<string | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<ContentDraft | null>(null);
  const [showGaps, setShowGaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [newIntent, setNewIntent] = useState(MATRIX_INTENTS[0]);
  const [newAngle, setNewAngle] = useState(MATRIX_ANGLES[0]);
  const [newStage, setNewStage] = useState(MATRIX_STAGES[0]);
  const [newAudience, setNewAudience] = useState(MATRIX_AUDIENCES[0]);
  const [newTitle, setNewTitle] = useState("");
  const expandRequestSeq = useRef(0);
  const [draftLoadingCellId, setDraftLoadingCellId] = useState<string | null>(null);
  const [assertionCount, setAssertionCount] = useState(0);
  const [editCellId, setEditCellId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIntent, setEditIntent] = useState("");
  const [editAngle, setEditAngle] = useState("");
  const [editStage, setEditStage] = useState("");
  const [editAudience, setEditAudience] = useState("");
  const [editPriority, setEditPriority] = useState("0");
  const [savingCellId, setSavingCellId] = useState<string | null>(null);

  const draftsByCell = useMemo(() => {
    const map = new Map<string, ContentDraft>();
    for (const d of drafts) {
      const prev = map.get(d.cellId);
      if (!prev || d.version > prev.version) {
        map.set(d.cellId, d);
      }
    }
    return map;
  }, [drafts]);

  const load = useCallback(async () => {
    if (!brandId) {
      setCells([]);
      setDrafts([]);
      setGaps([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cellList, draftList, assertions] = await Promise.all([
        fetchMatrixCells(brandId),
        fetchContentDrafts(brandId),
        fetchAssertions(brandId),
      ]);
      setCells(cellList);
      setDrafts(draftList);
      setAssertionCount(assertions.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载语义矩阵失败");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function loadGaps() {
    if (!brandId) return;
    setError(null);
    try {
      const analysis = await fetchMatrixGaps(brandId);
      setGaps(analysis.gaps);
      setShowGaps(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载诊断缺口失败（请先完成跑批）");
    }
  }

  async function handleSyncGaps() {
    if (!brandId) return;
    setSyncing(true);
    setError(null);
    setInfo(null);
    try {
      const result = await syncMatrixGaps(brandId);
      setGaps(result.analysis.gaps);
      setShowGaps(true);
      setInfo(`已同步 ${result.cells.length} 个矩阵格子`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "同步缺口失败");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncAssertions() {
    if (!brandId) return;
    setSyncingAssertions(true);
    setError(null);
    setInfo(null);
    try {
      const result = await syncMatrixAssertions(brandId);
      setInfo(`已从断言生成 ${result.cells.length} 个矩阵格子`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "从断言生成矩阵失败");
    } finally {
      setSyncingAssertions(false);
    }
  }

  async function handleAddCell(e: FormEvent) {
    e.preventDefault();
    if (!brandId || !newIntent.trim() || !newAngle.trim() || !newTitle.trim()) return;
    setError(null);
    try {
      await createMatrixCell(brandId, {
        intent: newIntent.trim(),
        angle: newAngle.trim(),
        stage: newStage.trim(),
        audience: newAudience.trim(),
        title: newTitle.trim(),
        priority: 10,
      });
      setNewTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加格子失败");
    }
  }

  function startEditCell(cell: MatrixCell) {
    setEditCellId(cell.id);
    setEditTitle(cell.title);
    setEditIntent(cell.intent);
    setEditAngle(cell.angle);
    setEditStage(cell.stage);
    setEditAudience(cell.audience);
    setEditPriority(String(cell.priority));
  }

  async function handleSaveCell(cellId: string) {
    if (!brandId) return;
    const trimmedTitle = editTitle.trim();
    const trimmedIntent = editIntent.trim();
    const trimmedAngle = editAngle.trim();
    const trimmedStage = editStage.trim();
    const trimmedAudience = editAudience.trim();
    if (!trimmedIntent || !trimmedAngle || !trimmedStage || !trimmedAudience || !trimmedTitle) {
      setError("各维度与标题不能为空");
      return;
    }
    const priority = Number.parseInt(editPriority, 10);
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
      setError("优先级须在 0–100 之间");
      return;
    }
    setSavingCellId(cellId);
    setError(null);
    try {
      await updateMatrixCell(brandId, cellId, {
        intent: trimmedIntent,
        angle: trimmedAngle,
        stage: trimmedStage,
        audience: trimmedAudience,
        title: trimmedTitle,
        priority,
      });
      setEditCellId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新格子失败");
    } finally {
      setSavingCellId(null);
    }
  }

  async function handleGenerate(cellId: string) {
    if (!brandId) return;
    if (assertionCount === 0 && !window.confirm("尚未配置品牌断言，初稿将缺少事实依据。仍要生成？")) {
      return;
    }
    setGeneratingCellId(cellId);
    setError(null);
    try {
      const draft = await generateContentDraft(brandId, cellId);
      setExpandedCellId(cellId);
      setExpandedDraft(draft);
      await load();
      onDraftGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成初稿失败");
    } finally {
      setGeneratingCellId(null);
    }
  }

  async function handleExpandCell(cellId: string) {
    if (!brandId) return;
    if (expandedCellId === cellId) {
      expandRequestSeq.current += 1;
      setExpandedCellId(null);
      setExpandedDraft(null);
      return;
    }
    const requestId = ++expandRequestSeq.current;
    setExpandedDraft(null);
    setExpandedCellId(cellId);
    setDraftLoadingCellId(cellId);
    try {
      const cellDrafts = await fetchCellContentDrafts(brandId, cellId);
      if (requestId === expandRequestSeq.current) {
        setExpandedDraft(cellDrafts[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载初稿失败");
    } finally {
      if (requestId === expandRequestSeq.current) {
        setDraftLoadingCellId(null);
      }
    }
  }

  async function handleMarkReview(draft: ContentDraft) {
    if (!brandId) return;
    try {
      const updated = await updateContentDraft(brandId, draft.id, { status: "review" });
      setExpandedDraft(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新状态失败");
    }
  }

  async function handleDeleteCell(cellId: string) {
    if (!brandId) return;
    setError(null);
    try {
      await deleteMatrixCell(brandId, cellId);
      if (expandedCellId === cellId) {
        setExpandedCellId(null);
        setExpandedDraft(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除格子失败");
    }
  }

  const selectedCell = cells.find((c) => c.id === expandedCellId) ?? null;

  return (
    <section id="section-matrix" className="card">
      <div className="section-header">
        <h2 className="section-title">语义矩阵</h2>
        <div className="btn-row">
          <button type="button" className="btn-secondary btn-sm" onClick={() => void loadGaps()} disabled={!brandId || loading}>
            查看缺口
          </button>
          <button
            type="button"
            className="btn-accent btn-sm"
            onClick={() => void handleSyncAssertions()}
            disabled={!brandId || syncingAssertions || assertionCount === 0}
          >
            {syncingAssertions ? "生成中…" : "从断言生成矩阵"}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void handleSyncGaps()} disabled={!brandId || syncing}>
            {syncing ? "同步中…" : "从诊断同步缺口"}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void load()} disabled={loading || !brandId}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>
      <p className="muted section-desc">
        用户意图 × 内容角度 × 内容阶段 × 目标受众，四维规划内容版图。可先「从断言生成矩阵」，或跑批后「从诊断同步缺口」并生成 GEO 初稿。
        {assertionCount === 0 && brandId && (
          <span className="warning-inline"> · 请先在「品牌断言」中录入事实</span>
        )}
      </p>

      {info && <p className="info compact">{info}</p>}
      {error && <p className="error compact">{error}</p>}

      {showGaps && (
        <div className="detail-block gaps-block">
          <h3>诊断缺口 ({gaps.length})</h3>
          {gaps.length === 0 ? (
            <p className="muted compact">暂无缺口，或尚未跑批</p>
          ) : (
            <ul className="gap-list">
              {gaps.map((g) => (
                <li key={`${g.intent}-${g.angle}`} className="gap-item">
                  <strong>{g.intent} · {g.angle}</strong>
                  <span className="priority-tag">P{g.priority}</span>
                  <p className="muted gap-reason">{g.reasons.join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form className="matrix-form" onSubmit={(e) => void handleAddCell(e)}>
        <MatrixDimensionField
          label="用户意图"
          listId="matrix-intents"
          value={newIntent}
          options={MATRIX_INTENTS}
          onChange={setNewIntent}
          disabled={!brandId}
        />
        <MatrixDimensionField
          label="内容角度"
          listId="matrix-angles"
          value={newAngle}
          options={MATRIX_ANGLES}
          onChange={setNewAngle}
          disabled={!brandId}
        />
        <MatrixDimensionField
          label="内容阶段"
          listId="matrix-stages"
          value={newStage}
          options={MATRIX_STAGES}
          onChange={setNewStage}
          disabled={!brandId}
        />
        <MatrixDimensionField
          label="目标受众"
          listId="matrix-audiences"
          value={newAudience}
          options={MATRIX_AUDIENCES}
          onChange={setNewAudience}
          disabled={!brandId}
        />
        <label className="matrix-dimension-field">
          <span>格子标题</span>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="简短描述该格子" disabled={!brandId} />
        </label>
        <button
          type="submit"
          className="btn-secondary"
          disabled={
            !brandId ||
            !newIntent.trim() ||
            !newAngle.trim() ||
            !newStage.trim() ||
            !newAudience.trim() ||
            !newTitle.trim()
          }
        >
          添加格子
        </button>
      </form>

      {loading ? (
        <p className="muted compact">加载矩阵…</p>
      ) : cells.length === 0 ? (
        <p className="muted compact">暂无矩阵格子 — 录入断言后点「从断言生成矩阵」，或跑批后同步缺口</p>
      ) : (
        <>
          <div className="matrix-3d-stage">
            <div className="matrix-3d-grid">
              {cells.map((cell) => {
                const latest = draftsByCell.get(cell.id);
                const isSelected = expandedCellId === cell.id;
                const isHigh = cell.priority >= 50;
                return (
                  <button
                    key={cell.id}
                    type="button"
                    className={`matrix-cube ${isSelected ? "is-selected" : ""} ${isHigh ? "is-high" : ""} ${latest ? "has-draft" : ""}`}
                    onClick={() => void handleExpandCell(cell.id)}
                  >
                    <div className="matrix-cube-stack">
                      <div className="matrix-cube-body">
                        <span className="matrix-cube-priority">P{cell.priority}</span>
                        <strong className="matrix-cube-title">{cell.title}</strong>
                        <span className="matrix-cube-meta">{cell.intent} · {cell.angle}</span>
                        <span className="matrix-cube-meta">{cell.stage} · {cell.audience}</span>
                        {latest && (
                          <span className="matrix-cube-draft">
                            初稿 v{latest.version} · {DRAFT_STATUS_LABELS[latest.status]}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedCell && (
            <div id="section-drafts" className="matrix-cube-inspector">
              <div className="matrix-cube-inspector-header">
                <h3>{selectedCell.title}</h3>
                <span className="muted">
                  {selectedCell.intent} · {selectedCell.angle} · {selectedCell.stage} · {selectedCell.audience}
                </span>
              </div>

              {editCellId === selectedCell.id ? (
                <div className="matrix-edit-form">
                  <label>
                    标题
                    <input className="cell-edit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </label>
                  <label>
                    意图
                    <input className="cell-edit-input" value={editIntent} onChange={(e) => setEditIntent(e.target.value)} />
                  </label>
                  <label>
                    角度
                    <input className="cell-edit-input" value={editAngle} onChange={(e) => setEditAngle(e.target.value)} />
                  </label>
                  <label>
                    阶段
                    <input className="cell-edit-input" value={editStage} onChange={(e) => setEditStage(e.target.value)} />
                  </label>
                  <label>
                    受众
                    <input className="cell-edit-input" value={editAudience} onChange={(e) => setEditAudience(e.target.value)} />
                  </label>
                  <label>
                    优先级
                    <input
                      className="cell-edit-priority"
                      type="number"
                      min={0}
                      max={100}
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                    />
                  </label>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={savingCellId === selectedCell.id}
                      onClick={() => void handleSaveCell(selectedCell.id)}
                    >
                      {savingCellId === selectedCell.id ? "保存中…" : "保存"}
                    </button>
                    <button type="button" className="btn-link" onClick={() => setEditCellId(null)}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="btn-row matrix-cube-inspector-actions">
                  <button type="button" className="btn-link btn-sm" onClick={() => startEditCell(selectedCell)}>
                    编辑格子
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={generatingCellId === selectedCell.id}
                    onClick={() => void handleGenerate(selectedCell.id)}
                  >
                    {generatingCellId === selectedCell.id ? "生成中…" : "生成初稿"}
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label="删除格子"
                    onClick={() => void handleDeleteCell(selectedCell.id)}
                  >
                    ×
                  </button>
                </div>
              )}

              {draftLoadingCellId === selectedCell.id ? (
                <p className="muted compact">加载初稿…</p>
              ) : expandedDraft ? (
                <div className="draft-preview">
                  <div className="draft-preview-header">
                    <span>
                      v{expandedDraft.version} · {DRAFT_STATUS_LABELS[expandedDraft.status]}
                    </span>
                    {expandedDraft.status === "draft" && (
                      <button type="button" className="btn-secondary btn-sm" onClick={() => void handleMarkReview(expandedDraft)}>
                        提交审核
                      </button>
                    )}
                  </div>
                  <DraftEditor
                    brandId={brandId}
                    draft={expandedDraft}
                    onSaved={(updated) => {
                      setExpandedDraft(updated);
                      void load();
                    }}
                    onDeleted={() => {
                      setExpandedDraft(null);
                      void load();
                    }}
                  />
                </div>
              ) : (
                <p className="muted compact">暂无初稿，点击「生成初稿」创建内容</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
