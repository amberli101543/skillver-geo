import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  fetchAlertThresholds,
  fetchAlertNotifications,
  fetchAlerts,
  formatDateTime,
  formatPct,
  updateAlert,
  updateAlertNotifications,
  updateAlertThresholds,
  type Alert,
  type AlertNotificationConfig,
  type AlertStatus,
  type AlertThresholdConfig,
} from "./api";

interface AlertsPanelProps {
  brandId: string;
  refreshKey?: number;
}

function SeverityBadge({ severity }: { severity: Alert["severity"] }) {
  return (
    <span className={`badge ${severity === "critical" ? "badge-warn" : "badge-neutral"}`}>
      {severity === "critical" ? "严重" : "警告"}
    </span>
  );
}

export function AlertsPanel({ brandId, refreshKey = 0 }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThresholdConfig | null>(null);
  const [notifications, setNotifications] = useState<AlertNotificationConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertStatus | "all">("open");

  const [mentionRateMin, setMentionRateMin] = useState("0.4");
  const [avgAccuracyMin, setAvgAccuracyMin] = useState("0.5");
  const [itemAccuracyMin, setItemAccuracyMin] = useState("0.5");
  const [mentionDropMax, setMentionDropMax] = useState("0.15");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  const load = useCallback(async () => {
    if (!brandId) {
      setAlerts([]);
      setThresholds(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [alertList, thresholdConfig, notificationConfig] = await Promise.all([
        fetchAlerts(brandId, filter === "all" ? undefined : filter),
        fetchAlertThresholds(brandId),
        fetchAlertNotifications(brandId),
      ]);
      setAlerts(alertList);
      setThresholds(thresholdConfig);
      setNotifications(notificationConfig);
      setMentionRateMin(String(thresholdConfig.mentionRateMin));
      setAvgAccuracyMin(String(thresholdConfig.avgAccuracyMin));
      setItemAccuracyMin(String(thresholdConfig.itemAccuracyMin));
      setMentionDropMax(String(thresholdConfig.mentionDropMax));
      setWebhookEnabled(notificationConfig.webhookEnabled);
      setWebhookUrl(notificationConfig.webhookUrl ?? "");
      setEmailEnabled(notificationConfig.emailEnabled);
      setEmailTo(notificationConfig.emailTo ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载告警失败");
    } finally {
      setLoading(false);
    }
  }, [brandId, filter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleStatusChange(alertId: string, status: AlertStatus) {
    if (!brandId) return;
    setError(null);
    try {
      await updateAlert(brandId, alertId, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新告警失败");
    }
  }

  async function handleSaveThresholds(e: FormEvent) {
    e.preventDefault();
    if (!brandId) return;
    setSavingThresholds(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await updateAlertThresholds(brandId, {
        mentionRateMin: Number(mentionRateMin),
        avgAccuracyMin: Number(avgAccuracyMin),
        itemAccuracyMin: Number(itemAccuracyMin),
        mentionDropMax: Number(mentionDropMax),
      });
      setThresholds(updated);
      setInfo("阈值已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存阈值失败");
    } finally {
      setSavingThresholds(false);
    }
  }

  async function handleSaveNotifications(e: FormEvent) {
    e.preventDefault();
    if (!brandId) return;
    setSavingNotifications(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await updateAlertNotifications(brandId, {
        webhookEnabled,
        webhookUrl: webhookUrl.trim() || null,
        emailEnabled,
        emailTo: emailTo.trim() || null,
      });
      setNotifications(updated);
      setInfo("外推设置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存外推设置失败");
    } finally {
      setSavingNotifications(false);
    }
  }

  const openCount = alerts.filter((a) => a.status === "open").length;

  return (
    <section id="section-alerts" className="card">
      <div className="section-header">
        <h2 className="section-title">
          监测告警{filter === "open" && openCount > 0 ? ` (${openCount})` : ""}
        </h2>
        <div className="alert-toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value as AlertStatus | "all")}>
            <option value="open">待处理</option>
            <option value="all">全部</option>
            <option value="acknowledged">已确认</option>
            <option value="resolved">已解决</option>
          </select>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>
      <p className="muted section-desc">
        跑批后自动检测错误表述、指标阈值与提及率下跌；可配置 Webhook / 邮件外推。
      </p>

      {info && <p className="info compact">{info}</p>}
      {error && <p className="error compact">{error}</p>}

      {!brandId ? (
        <p className="muted compact">请选择品牌</p>
      ) : alerts.length === 0 ? (
        <p className="muted compact">
          {filter === "open"
            ? "暂无待处理告警 — 完成「一键诊断跑批」后系统会自动生成"
            : "暂无告警记录 — 完成跑批后才会产生监测告警"}
        </p>
      ) : (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert-item alert-${alert.severity}`}>
              <div className="alert-item-header">
                <strong>{alert.title}</strong>
                <div className="alert-badges">
                  <SeverityBadge severity={alert.severity} />
                  <span className="badge badge-neutral">{ALERT_TYPE_LABELS[alert.type]}</span>
                  <span className="badge badge-neutral">{ALERT_STATUS_LABELS[alert.status]}</span>
                </div>
              </div>
              <p className="alert-message">{alert.message}</p>
              <p className="muted alert-meta">
                {formatDateTime(alert.createdAt)}
                {alert.metricValue !== undefined && alert.threshold !== undefined
                  ? ` · ${alert.metric}: ${formatPct(alert.metricValue)} / 阈值 ${formatPct(alert.threshold)}`
                  : ""}
              </p>
              {alert.status === "open" && (
                <div className="alert-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => void handleStatusChange(alert.id, "acknowledged")}
                  >
                    确认
                  </button>
                  <button
                    type="button"
                    className="btn-accent btn-sm"
                    onClick={() => void handleStatusChange(alert.id, "resolved")}
                  >
                    标记解决
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="detail-block">
        <h3>告警外推</h3>
        {notifications && (
          <form className="notification-form" onSubmit={(e) => void handleSaveNotifications(e)}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={webhookEnabled}
                onChange={(e) => setWebhookEnabled(e.target.checked)}
              />
              启用 Webhook
            </label>
            <label>
              Webhook URL
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/alerts"
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              启用邮件（无 SMTP 时记录 stub 日志）
            </label>
            <label>
              收件邮箱
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="ops@example.com"
              />
            </label>
            <button type="submit" className="btn-secondary btn-sm" disabled={savingNotifications || !brandId}>
              {savingNotifications ? "保存中…" : "保存外推设置"}
            </button>
          </form>
        )}
      </div>

      <div className="detail-block">
        <h3>告警阈值</h3>
        {thresholds && (
          <form className="threshold-form" onSubmit={(e) => void handleSaveThresholds(e)}>
            <label>
              最低提及率
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={mentionRateMin}
                onChange={(e) => setMentionRateMin(e.target.value)}
              />
            </label>
            <label>
              最低平均准确性
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={avgAccuracyMin}
                onChange={(e) => setAvgAccuracyMin(e.target.value)}
              />
            </label>
            <label>
              单题准确性下限
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={itemAccuracyMin}
                onChange={(e) => setItemAccuracyMin(e.target.value)}
              />
            </label>
            <label>
              提及率最大跌幅
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={mentionDropMax}
                onChange={(e) => setMentionDropMax(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-secondary btn-sm" disabled={savingThresholds || !brandId}>
              {savingThresholds ? "保存中…" : "保存阈值"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
