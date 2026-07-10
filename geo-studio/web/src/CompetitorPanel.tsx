import { useCallback, useEffect, useState, type FormEvent } from "react";
import { addCompetitor, deleteCompetitor, fetchCompetitors, type Competitor } from "./api";

interface CompetitorPanelProps {
  brandId: string;
  refreshKey?: number;
}

export function CompetitorPanel({ brandId, refreshKey = 0 }: CompetitorPanelProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setCompetitors([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCompetitors(await fetchCompetitors(brandId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载竞品失败");
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !brandId) return;
    setSaving(true);
    setError(null);
    try {
      await addCompetitor(brandId, trimmed);
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加竞品失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(competitorId: string) {
    if (!brandId) return;
    setError(null);
    try {
      await deleteCompetitor(brandId, competitorId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除竞品失败");
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">竞品库</h2>
      <p className="muted section-desc">已存竞品会在跑批时自动生成对比题。</p>

      <form className="inline-form" onSubmit={(e) => void handleAdd(e)}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="竞品名称"
          disabled={!brandId || saving}
        />
        <button type="submit" className="btn-secondary" disabled={!brandId || saving || !name.trim()}>
          {saving ? "添加中…" : "添加"}
        </button>
      </form>

      {error && <p className="error compact">{error}</p>}
      {loading ? (
        <p className="muted compact">加载竞品…</p>
      ) : competitors.length === 0 ? (
        <p className="muted compact">暂无已存竞品</p>
      ) : (
        <ul className="tag-list">
          {competitors.map((c) => (
            <li key={c.id} className="tag-item">
              <span>{c.name}</span>
              <button
                type="button"
                className="btn-icon"
                aria-label={`删除 ${c.name}`}
                onClick={() => void handleRemove(c.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
