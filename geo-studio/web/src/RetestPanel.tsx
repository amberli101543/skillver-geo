import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  fetchRetestSchedule,
  formatDateTime,
  updateRetestSchedule,
  type RetestSchedule,
} from "./api";

interface RetestPanelProps {
  brandId: string;
  refreshKey?: number;
}

export function RetestPanel({ brandId, refreshKey = 0 }: RetestPanelProps) {
  const [schedule, setSchedule] = useState<RetestSchedule | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [intervalHours, setIntervalHours] = useState("168");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setSchedule(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRetestSchedule(brandId);
      setSchedule(data);
      setEnabled(data.enabled);
      setIntervalHours(String(data.intervalHours));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载复测配置失败");
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!brandId) return;
    const hours = Number.parseInt(intervalHours, 10);
    if (!Number.isInteger(hours) || hours < 1 || hours > 8760) {
      setError("间隔须在 1–8760 小时之间");
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await updateRetestSchedule(brandId, { enabled, intervalHours: hours });
      setSchedule(updated);
      setInfo("复测配置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存复测配置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">定时复测</h2>
      <p className="muted section-desc">按间隔自动触发诊断跑批（后台 worker 轮询执行）。</p>

      {loading ? (
        <p className="muted compact">加载复测配置…</p>
      ) : (
        <form className="retest-form" onSubmit={(e) => void handleSave(e)}>
          <label className="retest-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!brandId || saving}
            />
            启用定时复测
          </label>
          <label className="retest-interval">
            <input
              type="number"
              min={1}
              max={8760}
              value={intervalHours}
              onChange={(e) => setIntervalHours(e.target.value)}
              disabled={!brandId || saving}
            />
            <span>间隔（小时）</span>
          </label>
          <button type="submit" className="btn-secondary" disabled={!brandId || saving}>
            {saving ? "保存中…" : "保存配置"}
          </button>
        </form>
      )}

      {schedule?.lastRunAt && (
        <p className="muted compact">上次复测：{formatDateTime(schedule.lastRunAt)}</p>
      )}
      {schedule?.nextRunAt && enabled && (
        <p className="muted compact">下次复测：{formatDateTime(schedule.nextRunAt)}</p>
      )}
      {error && <p className="error compact">{error}</p>}
      {info && <p className="info compact">{info}</p>}
    </section>
  );
}
