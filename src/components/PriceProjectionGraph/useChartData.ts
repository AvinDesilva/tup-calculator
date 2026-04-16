import { useEffect, useMemo, useReducer } from "react";
import { fixedFrictionGrowth } from "../../lib/companyScorecard/vdr.ts";
import type { VDRContext } from "../../lib/companyScorecard/vdr.ts";
import type { GrowthScenario, HistoricalPricePoint, LifecycleStage, TUPResult } from "../../lib/types.ts";
import type { ChartPoint } from "./constants.ts";

// How many weeks of history to show and how many years to project per view
const HIST_WEEKS = { 2: 104, 5: 260, 10: 520 } as const;
const PROJ_YEARS = { 2: 5,   5: 5,   10: 10  } as const;

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const yr = String(d.getFullYear()).slice(2);
  const mo = d.getMonth() + 1;
  return `${mo}/${yr}`;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

export function useChartData(
  priceHistory: HistoricalPricePoint[],
  currentPrice: number,
  scenarioValues: Record<GrowthScenario, { y1: number; y2: number | null; cagr: number | null }>,
  result: TUPResult | null,
  viewYears: 2 | 5 | 10,
  rollingDice: boolean,
  lifecycleStage: LifecycleStage | null | undefined,
  dividendYield: number | undefined,
): { chartData: ChartPoint[]; todayLabel: string; chartKey: string; yDomain: [number, number] } {
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

    // ── FF decay: build yearly price anchors ─────────────────────────────────
    // projYears must come first so buildAnchors can close over it.
    const projYears = PROJ_YEARS[viewYears];

    const ffCtx: VDRContext = {
      stage: lifecycleStage ?? null,
      operatingMargin: null,
      dividendYield: dividendYield ?? 0,
      ttmEPS: 0,
    };

    // Price at each integer year y: anchors[y] = anchors[y-1] × (1 + G(y))
    // G(y) = fixedFrictionGrowth(initialRate, y, ctx) — decays after hold period
    const buildAnchors = (initialRatePct: number): number[] => {
      const r0 = initialRatePct / 100;
      const anchors = [currentPrice];
      for (let y = 1; y <= projYears; y++) {
        anchors.push(anchors[y - 1] * (1 + fixedFrictionGrowth(r0, y, ffCtx)));
      }
      return anchors;
    };

    const baseAnchors = buildAnchors(baseRate);
    const bullAnchors = buildAnchors(bullRate);
    const bearAnchors = buildAnchors(bearRate);

    // Exponential interpolation between integer-year anchors for smooth sub-year points:
    // price(k + α) = anchors[k] × (anchors[k+1] / anchors[k])^α
    const priceAt = (anchors: number[], frac: number): number => {
      const k = Math.floor(frac);
      const k1 = Math.min(k + 1, projYears);
      const alpha = frac - k;
      if (alpha === 0 || anchors[k] === 0) return anchors[k];
      return anchors[k] * Math.pow(anchors[k1] / anchors[k], alpha);
    };

    // ── Projection points — sized so projections fill 1/2 of chart width ──
    // Each recharts data point gets equal x-axis space. We want:
    //   historical (incl. join) : projections = 1 : 1
    // So projCount = histCount + 1 (for join point).
    const projCount = historical.length + 1;
    const projectionPoints: ChartPoint[] = Array.from({ length: projCount }, (_, i) => {
      const frac = ((i + 1) / projCount) * projYears; // years ahead (evenly spaced)
      const d = new Date(today);
      d.setDate(d.getDate() + Math.round(frac * 365.25));
      return {
        label: formatMonthLabel(toDateStr(d)),
        base: parseFloat(priceAt(baseAnchors, frac).toFixed(2)),
        bull: parseFloat(priceAt(bullAnchors, frac).toFixed(2)),
        bear: parseFloat(priceAt(bearAnchors, frac).toFixed(2)),
      };
    });

    return [...historical, joinPoint, ...projectionPoints];
  }, [priceHistory, currentPrice, scenarioValues, result, viewYears, lifecycleStage, dividendYield]);

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

  return { chartData, todayLabel, chartKey, yDomain };
}
