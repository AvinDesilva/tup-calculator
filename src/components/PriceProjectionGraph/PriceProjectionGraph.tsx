import { useEffect, useMemo, useReducer, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import { C } from "../../lib/theme.ts";
import type { PriceProjectionGraphProps } from "./PriceProjectionGraph.types.ts";

type ChartPoint = {
  label: string;
  historical?: number;
  base?: number;
  bull?: number;
  bear?: number;
  sma?: number;
};

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const yr = String(d.getFullYear()).slice(2);
  const mo = d.getMonth() + 1;
  return `${mo}/${yr}`;
}


function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// How many weeks of history to show and how many years to project per view
const HIST_WEEKS = { 2: 104, 5: 260, 10: 520 } as const;
const PROJ_YEARS = { 2: 5,   5: 5,   10: 10  } as const;

// For 5Y/10Y views, sample weekly data down to one point per month
function toMonthly<T extends { date: string }>(pts: T[]): T[] {
  const out: T[] = [];
  let prev = "";
  for (const p of pts) {
    const mo = p.date.slice(0, 7);
    if (mo !== prev) { out.push(p); prev = mo; }
  }
  return out;
}

export function PriceProjectionGraph({
  priceHistory,
  currentPrice,
  scenarioValues,
  growthScenario,
  result,
  sma200,
  rollingDice,
  onScenarioChange,
}: PriceProjectionGraphProps) {
  const body = C.body;
  const mono = C.mono;

  // Single toggle: 2Y / 5Y / 10Y view window (2Y default)
  // Controls both how much history to show and how many years to project
  const [viewYears, setViewYears] = useState<2 | 5 | 10>(2);
  const [showSma, setShowSma] = useState(true);

  const smaColor = "#bf5fff";

  const chartData = useMemo<ChartPoint[]>(() => {
    if (currentPrice <= 0) return [];

    // ── CAGR for each scenario (percent) ─────────────────────────────────────
    const fallbackRate = (result?.grTerminal ?? result?.gr ?? 0.1) * 100;
    const getRate = (s: "bear" | "base" | "bull"): number => {
      const cagr = scenarioValues[s].cagr;
      if (cagr != null) return cagr;
      if (s === "base") return fallbackRate;
      if (s === "bull") return fallbackRate * 1.5;
      return fallbackRate * 0.5;
    };
    const bearRate = getRate("bear");
    const baseRate = getRate("base");
    const bullRate = getRate("bull");

    // ── 200-day SMA (rolling 40-week average) ────────────────────────────────
    // 200 trading days ÷ 5 trading days/week = 40-week window.
    // Computed over the full priceHistory so the visible slice always has
    // correct values (the first 39 weeks produce no SMA — line starts later).
    const SMA_WINDOW = 40;
    const smaByDate = new Map<string, number>();
    for (let i = SMA_WINDOW - 1; i < priceHistory.length; i++) {
      let sum = 0;
      for (let j = i - SMA_WINDOW + 1; j <= i; j++) sum += priceHistory[j].close;
      smaByDate.set(priceHistory[i].date, parseFloat((sum / SMA_WINDOW).toFixed(2)));
    }

    // ── Historical points ─────────────────────────────────────────────────────
    // 2Y: raw weekly data (no sampling) — finer curve
    // 5Y/10Y: sampled to monthly — less crowded
    const weeks = HIST_WEEKS[viewYears];
    const raw = priceHistory.slice(-weeks);
    const pts = viewYears === 2 ? raw : toMonthly(raw);
    const historical: ChartPoint[] = pts.map(p => ({
      label: formatMonthLabel(p.date),
      historical: p.close,
      sma: smaByDate.get(p.date),
    }));

    // ── Join point (today) — connects history to projections ──────────────────
    const today = new Date();
    const todayLabel = formatMonthLabel(toDateStr(today));
    const joinPoint: ChartPoint = {
      label: todayLabel,
      historical: currentPrice,
      base: currentPrice,
      bull: currentPrice,
      bear: currentPrice,
    };

    // ── Projection points — sized so projections fill 3/5ths of chart width ──
    // Each recharts data point gets equal x-axis space. We want:
    //   historical (incl. join) : projections = 2 : 3
    // So projCount = 1.5 × (histCount + 1 for join point).
    const projYears = PROJ_YEARS[viewYears];
    const projCount = Math.round(1.5 * (historical.length + 1));
    const projectionPoints: ChartPoint[] = Array.from({ length: projCount }, (_, i) => {
      const frac = ((i + 1) / projCount) * projYears; // years ahead (evenly spaced)
      const d = new Date(today);
      d.setDate(d.getDate() + Math.round(frac * 365.25));
      return {
        label: formatMonthLabel(toDateStr(d)),
        base: parseFloat((currentPrice * Math.pow(1 + baseRate / 100, frac)).toFixed(2)),
        bull: parseFloat((currentPrice * Math.pow(1 + bullRate / 100, frac)).toFixed(2)),
        bear: parseFloat((currentPrice * Math.pow(1 + bearRate / 100, frac)).toFixed(2)),
      };
    });

    return [...historical, joinPoint, ...projectionPoints];
  }, [priceHistory, currentPrice, scenarioValues, result, viewYears]);

  // Label of the "today" join point — used for the reference line
  const todayLabel = useMemo(() => formatMonthLabel(toDateStr(new Date())), []);

  // Only update the chart key (and replay animations) when dice is NOT rolling.
  // useReducer lets us dispatch from useEffect without triggering react-hooks/set-state-in-effect.
  const [chartKey, dispatchChartKey] = useReducer(
    (prev: string, action: { key: string; rolling: boolean }) =>
      action.rolling ? prev : action.key,
    "initial",
  );
  useEffect(() => {
    dispatchChartKey({
      key: `${priceHistory[priceHistory.length - 1]?.date ?? "empty"}-${currentPrice}`,
      rolling: rollingDice,
    });
  }, [priceHistory, currentPrice, rollingDice]);

  // Y-axis domain with 10% padding
  const yDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 100];
    let min = Infinity, max = -Infinity;
    for (const pt of chartData) {
      for (const v of [pt.historical, pt.base, pt.bull, pt.bear, pt.sma]) {
        if (v != null) { min = Math.min(min, v); max = Math.max(max, v); }
      }
    }
    const pad = (max - min) * 0.1;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  const tickFmt = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`;

  // Scenario line styles — active: full opacity + thicker, inactive: dimmed
  const lineStyle = (s: "bear" | "base" | "bull"): { strokeOpacity: number; strokeWidth: number } => ({
    strokeOpacity: growthScenario === s ? 1 : 0.3,
    strokeWidth:   growthScenario === s ? 2.5 : 1.5,
  });

  const COLORS = { base: "#ffffff", bull: "#10d97e", bear: "#FF4D00", historical: C.accent, sma: smaColor };
  const SCENARIO_RGBA = {
    base: { border: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.06)" },
    bull: { border: "rgba(16,217,126,0.2)",  bg: "rgba(16,217,126,0.06)"  },
    bear: { border: "rgba(255,77,0,0.2)",    bg: "rgba(255,77,0,0.06)"    },
  };

  // Custom tooltip — small dark box showing price for each visible line
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const entries = payload.filter((p: { value: unknown }) => p.value != null);
    if (!entries.length) return null;
    const PROJECTION_KEYS = new Set(["bear", "base", "bull"]);
    return (
      <div style={{
        background: "#111", border: "1px solid rgba(255,255,255,0.1)",
        padding: "6px 10px", fontSize: "10px", fontFamily: mono,
        pointerEvents: "none",
      }}>
        <div style={{ color: "#666", marginBottom: "4px", letterSpacing: "0.06em" }}>{label}</div>
        {entries.map((e: { dataKey: string; value: number }) => {
          const color = COLORS[e.dataKey as keyof typeof COLORS] ?? "#fff";
          const isProjection = PROJECTION_KEYS.has(e.dataKey) && currentPrice > 0;
          const pct = isProjection ? ((e.value - currentPrice) / currentPrice) * 100 : null;
          const pctStr = pct != null
            ? (pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`)
            : null;
          return (
            <div key={e.dataKey} style={{ display: "flex", alignItems: "baseline", gap: "8px", color, fontWeight: 600 }}>
              <span>{tickFmt(e.value)}</span>
              {pctStr != null && (
                <span style={{ fontSize: "9px", opacity: 0.75, fontWeight: 400 }}>{pctStr}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const legendItems: Array<{ key: "bear" | "base" | "bull"; label: string }> = [
    { key: "bear", label: "Bear" },
    { key: "base", label: "Base" },
    { key: "bull", label: "Bull" },
  ];

  // Toggle button style
  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: "2px 8px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    fontFamily: body,
    textTransform: "uppercase",
    background: active ? C.accent : "transparent",
    color: active ? "#080808" : "#666",
    border: `1px solid ${active ? C.accent : "rgba(255,255,255,0.12)"}`,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  if (currentPrice <= 0) {
    return (
      <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: C.text3, fontFamily: body }}>No price data</span>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
          <button onClick={() => setViewYears(2)} style={{ ...toggleStyle(viewYears === 2), borderRight: "none" }}>2Y</button>
          <button onClick={() => setViewYears(5)} style={{ ...toggleStyle(viewYears === 5), borderRight: "none" }}>5Y</button>
          <button onClick={() => setViewYears(10)} style={toggleStyle(viewYears === 10)}>10Y</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={chartKey} data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: "#666", fontSize: 9, fontFamily: mono }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(chartData.length / 8)}
          />
          <YAxis
            orientation="right"
            tick={{ fill: "#666", fontSize: 9, fontFamily: mono }}
            tickLine={false}
            axisLine={false}
            tickFormatter={tickFmt}
            width={48}
            domain={yDomain}
          />

          <Tooltip
            content={ChartTooltip}
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
          />

          {/* Vertical marker at today */}
          <ReferenceLine
            x={todayLabel}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />

          {/* 200-day SMA — curved line following the rolling 40-week average */}
          <Line
            type="monotone"
            dataKey="sma"
            stroke={smaColor}
            strokeOpacity={0.45}
            strokeDasharray="2 5"
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={true}
            animationBegin={1700}
            animationDuration={400}
            animationEasing="ease-out"
            hide={!showSma}
          />

          {/* Historical — gold solid */}
          <Line
            type="monotone"
            dataKey="historical"
            stroke={C.accent}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          />

          {/* Base — white dashed */}
          <Line
            type="monotone"
            dataKey="base"
            stroke={COLORS.base}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.base, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={true}
            animationBegin={900}
            animationDuration={600}
            animationEasing="ease-out"
            {...lineStyle("base")}
          />

          {/* Bull — green dashed */}
          <Line
            type="monotone"
            dataKey="bull"
            stroke={COLORS.bull}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.bull, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={true}
            animationBegin={900}
            animationDuration={600}
            animationEasing="ease-out"
            {...lineStyle("bull")}
          />

          {/* Bear — red dashed */}
          <Line
            type="monotone"
            dataKey="bear"
            stroke={COLORS.bear}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.bear, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={true}
            animationBegin={900}
            animationDuration={600}
            animationEasing="ease-out"
            {...lineStyle("bear")}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px", flexShrink: 0 }}>
        {legendItems.map(({ key, label }) => {
          const active = growthScenario === key;
          const color = COLORS[key];
          const rgba = SCENARIO_RGBA[key];
          return (
            <button
              key={key}
              onClick={() => onScenarioChange?.(key)}
              aria-pressed={active}
              aria-label={`${label} scenario`}
              style={{
                display: "flex", alignItems: "center",
                opacity: active ? 1 : 0.45,
                cursor: onScenarioChange ? "pointer" : "default",
                padding: "5px 12px",
                borderLeft: `2px solid ${color}`,
                borderTop: `1px solid ${rgba.border}`,
                borderRight: `1px solid ${rgba.border}`,
                borderBottom: `1px solid ${rgba.border}`,
                background: rgba.bg,
                transition: "opacity 0.15s",
              }}
            >
              <span style={{ fontSize: "9px", fontFamily: body, letterSpacing: "0.1em", textTransform: "uppercase", color, fontWeight: 700 }}>
                {label}
              </span>
            </button>
          );
        })}

        {/* SMA toggle */}
        {sma200 > 0 && (
          <button
            onClick={() => setShowSma(s => !s)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: "transparent", border: "none", cursor: "pointer",
              padding: "2px 0", opacity: showSma ? 1 : 0.35,
              transition: "opacity 0.15s",
            }}
            aria-pressed={showSma}
            aria-label="Toggle 200-day SMA line"
          >
            <svg width="18" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="18" y2="4"
                stroke={smaColor}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            </svg>
            <span style={{ fontSize: "9px", fontFamily: body, letterSpacing: "0.1em", textTransform: "uppercase", color: smaColor, fontWeight: 400 }}>
              200 SMA
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
