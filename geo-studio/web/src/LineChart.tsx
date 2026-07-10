import { type MetricTrendPoint } from "./api";

const W = 560;
const H = 160;
const PAD = { top: 12, right: 16, bottom: 36, left: 40 };

const COMPARE_STROKES = ["line-path", "line-path-alt-1", "line-path-alt-2", "line-path-alt-3"];

export interface CompareLineSeries {
  label: string;
  points: MetricTrendPoint[];
}

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${da} ${hh}:${mm}`;
}

function chartPoints(points: MetricTrendPoint[]): { x: number; y: number; p: MetricTrendPoint }[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = sorted.length;
  return sorted.map((p, i) => {
    const x = PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = PAD.top + innerH * (1 - Math.min(1, Math.max(0, p.value)));
    return { x, y, p };
  });
}

function compareChartLayers(seriesList: CompareLineSeries[]) {
  const allTimes = [
    ...new Set(seriesList.flatMap((s) => s.points.map((p) => p.capturedAt))),
  ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  if (allTimes.length === 0) {
    return { layers: [] as Array<{ label: string; strokeClass: string; coords: { x: number; y: number; capturedAt: string; value: number }[] }>, axisTimes: [] as string[] };
  }
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = allTimes.length;
  const layers = seriesList.map((series, index) => {
    const byTime = new Map(series.points.map((p) => [p.capturedAt, p.value]));
    const coords = allTimes.flatMap((capturedAt, i) => {
      const value = byTime.get(capturedAt);
      if (value === undefined) return [];
      const x = PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = PAD.top + innerH * (1 - Math.min(1, Math.max(0, value)));
      return [{ x, y, capturedAt, value }];
    });
    return {
      label: series.label,
      strokeClass: COMPARE_STROKES[index % COMPARE_STROKES.length] ?? "line-path",
      coords,
    };
  });
  return { layers, axisTimes: allTimes };
}

export function LineChart({
  title,
  points = [],
  compareSeries,
}: {
  title: string;
  points?: MetricTrendPoint[];
  compareSeries?: CompareLineSeries[];
}) {
  const compareMode = (compareSeries?.length ?? 0) > 0;
  const coords = compareMode ? [] : chartPoints(points);
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const { layers, axisTimes } = compareMode ? compareChartLayers(compareSeries!) : { layers: [], axisTimes: [] };
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const innerH = H - PAD.top - PAD.bottom;
  const hasData = compareMode ? layers.some((l) => l.coords.length > 0) : points.length > 0;

  return (
    <section className="card chart">
      <h3>{title}</h3>
      {!hasData ? (
        <p className="muted">暂无数据 — 点击「开始诊断跑批」生成首条记录</p>
      ) : (
        <div className="line-chart-wrap">
          {compareMode && (
            <ul className="chart-legend">
              {layers.map((layer) => (
                <li key={layer.label}>
                  <span className={`chart-legend-swatch ${layer.strokeClass}`} aria-hidden />
                  {layer.label}
                </li>
              ))}
            </ul>
          )}
          <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" role="img" aria-label={title}>
            {yTicks.map((t) => {
              const y = PAD.top + innerH * (1 - t);
              return (
                <g key={t}>
                  <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="grid-line" />
                  <text x={PAD.left - 6} y={y + 4} textAnchor="end" className="axis-label">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
            {compareMode
              ? layers.map((layer) => (
                  <g key={layer.label}>
                    {layer.coords.length > 1 && (
                      <polyline
                        points={layer.coords.map((c) => `${c.x},${c.y}`).join(" ")}
                        fill="none"
                        className={layer.strokeClass}
                        strokeWidth={2.5}
                      />
                    )}
                    {layer.coords.map((c) => (
                      <circle key={`${layer.label}-${c.capturedAt}`} cx={c.x} cy={c.y} r={3.5} className="line-dot" />
                    ))}
                  </g>
                ))
              : null}
            {!compareMode && coords.length > 1 && (
              <polyline points={polyline} fill="none" className="line-path" strokeWidth={2.5} />
            )}
            {!compareMode &&
              coords.map((c) => (
                <g key={c.p.capturedAt}>
                  <circle cx={c.x} cy={c.y} r={4} className="line-dot" />
                  <title>{`${formatAxisDate(c.p.capturedAt)}: ${(c.p.value * 100).toFixed(1)}%`}</title>
                </g>
              ))}
            {(compareMode ? axisTimes : coords.map((c) => c.p.capturedAt)).map((capturedAt, i, arr) =>
              i === 0 || i === arr.length - 1 || arr.length <= 4 ? (
                <text
                  key={`${capturedAt}-x`}
                  x={
                    compareMode
                      ? PAD.left +
                        (arr.length === 1
                          ? (W - PAD.left - PAD.right) / 2
                          : (i / (arr.length - 1)) * (W - PAD.left - PAD.right))
                      : coords[i]?.x ?? PAD.left
                  }
                  y={H - 8}
                  textAnchor="middle"
                  className="axis-label axis-x"
                >
                  {formatAxisDate(capturedAt)}
                </text>
              ) : null,
            )}
          </svg>
        </div>
      )}
    </section>
  );
}
