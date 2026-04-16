import type { TickerData } from "../types.ts";
import type { RadarMetricPoint } from "./types.ts";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function norm(value: number | null, floor: number, ceiling: number): number {
  if (value == null || !isFinite(value)) return 0;
  return clamp(((value - floor) / (ceiling - floor)) * 100, 0, 100);
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtRaw(v: number | null, formatter: (x: number) => string): string {
  return v == null ? "N/A" : formatter(v);
}

export function normalizeMetrics(d: TickerData): RadarMetricPoint[] {
  // Revenue growth: YoY from incomeHistory
  const rev0 = d.incomeHistory[0]?.revenue ?? 0;
  const rev1 = d.incomeHistory[1]?.revenue ?? 0;
  const revenueGrowth: number | null = rev1 > 0 ? (rev0 - rev1) / rev1 : null;

  // EPS growth (most recent year from history)
  const epsGrowthLatest: number | null = d.epsGrowthHistory.length > 0
    ? d.epsGrowthHistory[0].growth
    : null;

  // FCF margin: fcfPerShare / revenuePerShare
  const fcfMargin: number | null =
    d.freeCashFlowPerShare != null && d.revenuePerShare > 0
      ? d.freeCashFlowPerShare / d.revenuePerShare
      : null;

  // FCF yield: fcfPerShare / currentPrice
  const fcfYield: number | null =
    d.freeCashFlowPerShare != null && d.currentPrice > 0
      ? d.freeCashFlowPerShare / d.currentPrice
      : null;

  // Beta score: inverted (lower beta = better), range 0.5 → 2.0
  const betaScore: number | null = d.beta != null
    ? norm(d.beta, 2.0, 0.5)  // inverted: floor=2.0, ceiling=0.5
    : null;

  // D/E score: inverted (lower = better)
  const deScore: number | null = d.debtToEquity != null
    ? norm(d.debtToEquity, 2.0, 0.0)  // inverted
    : null;

  // P/E score: inverted (lower P/E = better value)
  const peScore: number | null = d.peRatio != null
    ? norm(d.peRatio, 40, 5)  // inverted
    : null;

  return [
    {
      axis: "Op Margin",
      value: norm((d.operatingMargin ?? 0) / 100, -0.10, 0.40),
      rawLabel: fmtRaw(d.operatingMargin, v => `${v.toFixed(1)}%`),
    },
    {
      axis: "Gross Margin",
      value: norm(d.grossMargin, 0, 0.80),
      rawLabel: fmtRaw(d.grossMargin, pct),
    },
    {
      axis: "Net Margin",
      value: norm(d.profitMargin, -0.05, 0.30),
      rawLabel: fmtRaw(d.profitMargin, pct),
    },
    {
      axis: "ROE",
      value: norm(d.returnOnEquity, 0, 0.30),
      rawLabel: fmtRaw(d.returnOnEquity, pct),
    },
    {
      axis: "ROA",
      value: norm(d.returnOnAssets, 0, 0.20),
      rawLabel: fmtRaw(d.returnOnAssets, pct),
    },
    {
      axis: "Low Beta",
      value: betaScore ?? 0,
      rawLabel: fmtRaw(d.beta, v => v.toFixed(2)),
    },
    {
      axis: "Low D/E",
      value: deScore ?? 0,
      rawLabel: fmtRaw(d.debtToEquity, v => v.toFixed(2)),
    },
    {
      axis: "Current Ratio",
      value: norm(d.currentRatio, 0.5, 3.0),
      rawLabel: fmtRaw(d.currentRatio, v => v.toFixed(2)),
    },
    {
      axis: "FCF Margin",
      value: norm(fcfMargin, -0.05, 0.30),
      rawLabel: fmtRaw(fcfMargin, pct),
    },
    {
      axis: "FCF Yield",
      value: norm(fcfYield, 0, 0.10),
      rawLabel: fmtRaw(fcfYield, pct),
    },
    {
      axis: "EPS Growth",
      value: norm(epsGrowthLatest, -0.10, 0.40),
      rawLabel: fmtRaw(epsGrowthLatest, pct),
    },
    {
      axis: "Rev Growth",
      value: norm(revenueGrowth, -0.05, 0.30),
      rawLabel: fmtRaw(revenueGrowth, pct),
    },
    {
      axis: "Value (P/E)",
      value: peScore ?? 0,
      rawLabel: fmtRaw(d.peRatio, v => v.toFixed(1)),
    },
    {
      axis: "Piotroski",
      value: norm(d.piotroski, 0, 9),
      rawLabel: fmtRaw(d.piotroski, v => `${v}/9`),
    },
  ];
}
