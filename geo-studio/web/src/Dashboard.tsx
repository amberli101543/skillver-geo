import { useCallback, useEffect, useState } from "react";
import {
  deleteBrand,
  fetchAuthMe,
  fetchBrandMetrics,
  fetchBrands,
  fetchEngineCapabilities,
  METRIC_LABELS,
  runDiagnosticBatch,
  STORAGE_KEY_BRAND,
  type Brand,
  type BrandMetricsTrend,
  type EngineCapability,
} from "./api";
import { LineChart } from "./LineChart";
import { CreateBrandModal } from "./CreateBrandModal";
import { EditBrandModal } from "./EditBrandModal";
import { CompetitorPanel } from "./CompetitorPanel";
import { AssertionsPanel } from "./AssertionsPanel";
import { RetestPanel } from "./RetestPanel";
import { EngineTestPanel } from "./EngineTestPanel";
import { AiSettingsPanel } from "./AiSettingsPanel";
import { DiagnosticRunsPanel } from "./DiagnosticRunsPanel";
import { MatrixPanel } from "./MatrixPanel";
import { DistributionPanel } from "./DistributionPanel";
import { AlertsPanel } from "./AlertsPanel";
import { JobQueuePanel } from "./JobQueuePanel";

interface DashboardProps {
  onLogout: () => void;
}

/** 按 GEO 工作流时间线：品牌 → 诊断 → 趋势 → 矩阵 → 初稿 → 分发 → 告警 */
const NAV_ITEMS = [
  { id: "section-brands", label: "多品牌" },
  { id: "section-runs", label: "诊断跑批" },
  { id: "section-trends", label: "趋势明细" },
  { id: "section-matrix", label: "语义矩阵" },
  { id: "section-drafts", label: "内容初稿" },
  { id: "section-distribution", label: "信源分发" },
  { id: "section-alerts", label: "监测告警" },
  { id: "section-jobs", label: "任务队列" },
] as const;

function scrollToSection(id: string) {
  const target =
    document.getElementById(id) ??
    (id === "section-drafts" ? document.getElementById("section-matrix") : null);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [username, setUsername] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [data, setData] = useState<BrandMetricsTrend | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);
  const [competitorsRefreshKey, setCompetitorsRefreshKey] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [matrixRefreshKey, setMatrixRefreshKey] = useState(0);
  const [assertionsRefreshKey, setAssertionsRefreshKey] = useState(0);
  const [distributionRefreshKey, setDistributionRefreshKey] = useState(0);
  const [alertsRefreshKey, setAlertsRefreshKey] = useState(0);
  const [engines, setEngines] = useState<EngineCapability[]>([]);
  const [selectedEngineIds, setSelectedEngineIds] = useState<string[]>([]);
  const [metricsEngineFilter, setMetricsEngineFilter] = useState<string>("all");

  useEffect(() => {
    void fetchEngineCapabilities()
      .then((list) => {
        setEngines(list);
        setSelectedEngineIds(list.map((e) => e.id));
      })
      .catch(() => {
        setEngines([]);
        setSelectedEngineIds([]);
      });
  }, []);

  function toggleEngine(id: string) {
    setSelectedEngineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  useEffect(() => {
    void fetchAuthMe()
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(""));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (mq.matches) setNavOpen(false);
    };
    mq.addEventListener("change", closeOnDesktop);
    return () => mq.removeEventListener("change", closeOnDesktop);
  }, []);

  function handleNavClick(id: string) {
    scrollToSection(id);
    setNavOpen(false);
  }

  const loadBrands = useCallback(async (selectId?: string) => {
    try {
      const list = await fetchBrands();
      setBrands(list);
      if (selectId && list.some((b) => b.id === selectId)) {
        setBrandId(selectId);
        return;
      }
      const saved = localStorage.getItem(STORAGE_KEY_BRAND);
      if (saved && list.some((b) => b.id === saved)) {
        setBrandId(saved);
      } else if (list[0]) {
        setBrandId(list[0].id);
      } else {
        setBrandId("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载品牌列表失败");
    }
  }, []);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    if (brandId) {
      localStorage.setItem(STORAGE_KEY_BRAND, brandId);
    }
    setSelectedRunId(null);
    setMetricsEngineFilter("all");
  }, [brandId]);

  useEffect(() => {
    if (!brandId) {
      setData(null);
      return;
    }
    void (async () => {
      try {
        setData(await fetchBrandMetrics(brandId));
      } catch {
        setData(null);
      }
    })();
  }, [brandId, runsRefreshKey]);

  async function runBatch() {
    if (!brandId) {
      setError("请选择品牌");
      return;
    }
    if (selectedEngineIds.length === 0) {
      setError("请至少选择一个引擎");
      return;
    }
    setBatching(true);
    setError(null);
    setInfo(null);
    try {
      const result = await runDiagnosticBatch(brandId, { engineIds: selectedEngineIds });
      const engineLabel =
        selectedEngineIds.length === engines.length
          ? `${engines.length} 个引擎`
          : selectedEngineIds.join("、");
      setInfo(
        `跑批完成（${engineLabel}）：${result.baseline.questionCount} 题，提及率 ${(result.baseline.mentionRate * 100).toFixed(0)}%`,
      );
      setRunsRefreshKey((k) => k + 1);
      setMatrixRefreshKey((k) => k + 1);
      setAlertsRefreshKey((k) => k + 1);
      if (result.diagnosticRunId) {
        setSelectedRunId(result.diagnosticRunId);
      }
      setData(await fetchBrandMetrics(brandId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "跑批失败");
    } finally {
      setBatching(false);
    }
  }

  async function handleDeleteBrand() {
    if (!brandId) return;
    const brand = brands.find((b) => b.id === brandId);
    if (!brand) return;
    if (!window.confirm(`确定删除品牌「${brand.name}」？相关诊断、矩阵与告警数据将一并删除。`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    setInfo(null);
    try {
      await deleteBrand(brandId);
      localStorage.removeItem(STORAGE_KEY_BRAND);
      setInfo(`已删除品牌「${brand.name}」`);
      await loadBrands();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除品牌失败");
    } finally {
      setDeleting(false);
    }
  }

  const selectedBrand = brands.find((b) => b.id === brandId);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-top">
          <h1>GEO Studio</h1>
          <div className="header-actions">
            <button
              type="button"
              className="header-nav-toggle"
              aria-expanded={navOpen}
              aria-controls="dashboard-nav"
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? "收起导航" : "模块导航"}
            </button>
            <button type="button" className="header-auth-btn" onClick={onLogout} title="退出登录">
              {username ? `${username} · 退出` : "退出登录"}
            </button>
          </div>
        </div>
        <nav
          id="dashboard-nav"
          className={`header-nav${navOpen ? " header-nav--open" : ""}`}
          aria-label="工作流模块"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="header-nav-btn"
              onClick={() => handleNavClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section id="section-brands" className="card brand-workspace">
        <div className="brand-workspace-bar">
          <label className="brand-select-field">
            <span className="field-label">当前品牌</span>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={brands.length === 0}>
              {brands.length === 0 ? (
                <option value="">暂无品牌</option>
              ) : (
                brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="brand-workspace-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setCreateOpen(true)}>
              新建品牌
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditOpen(true)} disabled={!brandId}>
              编辑
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm btn-danger-text"
              onClick={() => void handleDeleteBrand()}
              disabled={!brandId || deleting}
            >
              {deleting ? "删除中…" : "删除"}
            </button>
            <button
              type="button"
              className="btn-accent btn-sm"
              onClick={() => void runBatch()}
              disabled={batching || !brandId || selectedEngineIds.length === 0}
            >
              {batching ? "诊断中…" : "开始诊断跑批"}
            </button>
          </div>
          {engines.length > 0 && (
            <div className="engine-picker">
              <span className="engine-picker-label">跑批引擎</span>
              <div className="engine-picker-options">
                {engines.map((engine) => (
                  <label key={engine.id} className="engine-picker-option">
                    <input
                      type="checkbox"
                      checked={selectedEngineIds.includes(engine.id)}
                      onChange={() => toggleEngine(engine.id)}
                      disabled={batching}
                    />
                    <span title={engine.description}>{engine.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      <CompetitorPanel brandId={brandId} refreshKey={competitorsRefreshKey} />
      <AssertionsPanel
        brandId={brandId}
        refreshKey={assertionsRefreshKey}
        onChanged={() => setMatrixRefreshKey((k) => k + 1)}
      />
      <AiSettingsPanel />

      <DiagnosticRunsPanel
        brandId={brandId}
        refreshKey={runsRefreshKey}
        selectedRunId={selectedRunId}
        onSelectRunId={setSelectedRunId}
      />
      <RetestPanel brandId={brandId} />
      <EngineTestPanel brandId={brandId} />

      <div id="section-trends" className="charts">
        <div className="metrics-engine-bar">
          <span className="metrics-engine-label">趋势维度</span>
          <div className="metrics-engine-tabs">
            <button
              type="button"
              className={`btn-secondary btn-sm ${metricsEngineFilter === "all" ? "active" : ""}`}
              onClick={() => setMetricsEngineFilter("all")}
            >
              全部（跑批快照）
            </button>
            {Object.keys(data?.byEngine ?? {})
              .sort()
              .map((engineId) => (
                <button
                  key={engineId}
                  type="button"
                  className={`btn-secondary btn-sm ${metricsEngineFilter === engineId ? "active" : ""}`}
                  onClick={() => setMetricsEngineFilter(engineId)}
                >
                  {engines.find((e) => e.id === engineId)?.name ?? engineId}
                </button>
              ))}
          </div>
        </div>

        {Object.keys(data?.byEngine ?? {}).length >= 2 && (
          <LineChart
            title="提及率 · 多引擎对比"
            compareSeries={Object.keys(data!.byEngine)
              .sort()
              .map((engineId) => ({
                label: engines.find((e) => e.id === engineId)?.name ?? engineId,
                points:
                  data!.byEngine[engineId]?.find((s) => s.metric === "mention_rate")?.points ?? [],
              }))}
          />
        )}

        {(metricsEngineFilter === "all"
          ? data?.series
          : data?.byEngine?.[metricsEngineFilter]
        )?.map((s) => (
          <LineChart
            key={`${metricsEngineFilter}-${s.metric}`}
            title={
              metricsEngineFilter === "all"
                ? (METRIC_LABELS[s.metric] ?? s.metric)
                : `${engines.find((e) => e.id === metricsEngineFilter)?.name ?? metricsEngineFilter} · ${METRIC_LABELS[s.metric] ?? s.metric}`
            }
            points={s.points}
          />
        )) ??
          Object.keys(METRIC_LABELS).map((metric) => (
            <LineChart key={metric} title={METRIC_LABELS[metric] ?? metric} points={[]} />
          ))}
      </div>

      <MatrixPanel
        brandId={brandId}
        refreshKey={matrixRefreshKey}
        onDraftGenerated={() => setDistributionRefreshKey((k) => k + 1)}
      />
      <DistributionPanel brandId={brandId} refreshKey={distributionRefreshKey} />
      <AlertsPanel brandId={brandId} refreshKey={alertsRefreshKey} />
      <JobQueuePanel />

      <CreateBrandModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setInfo("品牌创建成功");
          setError(null);
          setCompetitorsRefreshKey((k) => k + 1);
          void loadBrands(id);
        }}
      />
      <EditBrandModal
        open={editOpen}
        brand={selectedBrand ?? null}
        onClose={() => setEditOpen(false)}
        onUpdated={(brand) => {
          setInfo("品牌已更新");
          setError(null);
          setBrands((prev) => prev.map((b) => (b.id === brand.id ? brand : b)));
        }}
      />

      <footer className="dashboard-footer">
        <p>
          GEO 致力于提升品牌在生成式 AI 中的可见度与叙事准确性，实现诊断、内容、分发与监测的全链路闭环。
        </p>
      </footer>
    </div>
  );
}
