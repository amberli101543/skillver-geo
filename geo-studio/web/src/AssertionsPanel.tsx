import { useCallback, useEffect, useState, type FormEvent } from "react";
import { addAssertion, deleteAssertion, fetchAssertions, type Assertion } from "./api";

interface AssertionsPanelProps {
  brandId: string;
  refreshKey?: number;
  onChanged?: () => void;
}

export function AssertionsPanel({ brandId, refreshKey = 0, onChanged }: AssertionsPanelProps) {
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setAssertions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAssertions(await fetchAssertions(brandId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载断言失败");
      setAssertions([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !brandId) return;
    setSaving(true);
    setError(null);
    try {
      await addAssertion(brandId, { text: trimmed });
      setText("");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加断言失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(assertionId: string) {
    if (!brandId) return;
    setError(null);
    try {
      await deleteAssertion(brandId, assertionId);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除断言失败");
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">品牌断言</h2>
      <p className="muted section-desc">记录品牌核心事实，用于内容初稿生成与跑批后缺失事实告警。</p>

      <form className="assertion-form" onSubmit={(e) => void handleAdd(e)}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="断言内容"
          disabled={!brandId || saving}
        />
        <button type="submit" className="btn-secondary" disabled={!brandId || saving || !text.trim()}>
          {saving ? "添加中…" : "添加"}
        </button>
      </form>

      {error && <p className="error compact">{error}</p>}
      {loading ? (
        <p className="muted compact">加载断言…</p>
      ) : assertions.length === 0 ? (
        <p className="muted compact">暂无品牌断言</p>
      ) : (
        <ul className="assertion-list">
          {assertions.map((a) => (
            <li key={a.id} className="assertion-item">
              <span className="assertion-text">{a.text}</span>
              <button
                type="button"
                className="btn-icon"
                aria-label={`删除断言 ${a.text}`}
                onClick={() => void handleRemove(a.id)}
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
