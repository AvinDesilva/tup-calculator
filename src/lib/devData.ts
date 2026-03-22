import type { InputState, FMPEarningSurprise, FMPCashFlow, FMPIncomeStatement, EpsGrowthPoint } from "./types.ts";

/**
 * Dummy AppLovin (APP) data for local dev preview — no API key needed.
 *
 * APP is an ideal test case for the EPS CAGR fix: EPS went from near-zero
 * ($0.10 in 2020) to $6.67 in 2025, with a loss year in 2022.
 *
 * OLD code (endpoint CAGR, no anchor shift):
 *   5yr CAGR = (6.67 / 0.10)^(1/5) - 1 = 131%  ← inflated by near-zero anchor
 *   10yr CAGR = windowMedianGrowth ≈ 167%        ← median of unwinsorized YoY rates
 *
 * FIXED code (anchor-shift + winsorized fallback):
 *   5yr CAGR = (6.67 / 0.45)^(1/4) - 1 = 96%   ← shifted anchor to 2021 ($0.45)
 *   10yr CAGR = (6.67 / 0.45)^(1/4) - 1 = 96%   ← shifted anchor to 2021 ($0.45)
 *   Both windows converge: idx 4 ($0.45) is the nearest positive-EPS anchor
 *   that yields ≤100% CAGR; no valid anchor between idx 2–3 (negative/extreme).
 */
export const DEV_TICKER = "APP";
export const DEV_COMPANY = "AppLovin Corporation";
export const DEV_META = { sector: "Technology", industry: "Software - Application" };

export const DEV_INP: InputState = {
  marketCap: 130_000_000_000,
  debt: 3_500_000_000,
  cash: 600_000_000,
  shares: 330_000_000,
  ttmEPS: 6.67,
  forwardEPS: 8.50,
  historicalGrowth: 96,
  analystGrowth: 28,
  fwdGrowthY1: 28,
  fwdGrowthY2: 22,
  fwdCAGR: 25,
  revenuePerShare: 16.67,
  targetMargin: 15,
  inceptionGrowth: 30,
  breakEvenYear: 2,
  currentPrice: 394,
  sma200: 320,
  dividendYield: 0,
  operatingMargin: 40,
  lifecycleStage: "high_growth",
  growthOverrides: {},
  vdrEnabled: true,
};

export const DEV_VALUATION = {
  dcf: 300,
  industryGrowth: {
    industry: "Software - Application",
    median: 18.2,
    p25: 10.5,
    p75: 28.0,
    count: 24,
    constituents: ["U", "RBLX", "TTD", "SNAP", "PINS"],
  },
  industryGrowthLoading: false,
};

export const DEV_EARNINGS: FMPEarningSurprise[] = [
  { actualEps: 2.10, estimatedEps: 1.85, date: "2025-09-30" },
  { actualEps: 1.82, estimatedEps: 1.60, date: "2025-06-30" },
  { actualEps: 1.67, estimatedEps: 1.45, date: "2025-03-31" },
  { actualEps: 1.73, estimatedEps: 1.50, date: "2024-12-31" },
  { actualEps: 1.25, estimatedEps: 1.08, date: "2024-09-30" },
  { actualEps: 1.10, estimatedEps: 0.85, date: "2024-06-30" },
  { actualEps: 0.67, estimatedEps: 0.52, date: "2024-03-31" },
  { actualEps: 0.49, estimatedEps: 0.42, date: "2023-12-31" },
];

export const DEV_CASH_FLOWS: FMPCashFlow[] = [
  { operatingCashFlow: 2_800_000_000 },
  { operatingCashFlow: 2_000_000_000 },
  { operatingCashFlow: 900_000_000 },
  { operatingCashFlow: 500_000_000 },
];

export const DEV_INCOME_HISTORY: FMPIncomeStatement[] = [
  { revenue: 5_500_000_000, netIncome: 2_200_000_000, calendarYear: "2025", grossProfit: 3_850_000_000, operatingIncome: 2_200_000_000 },
  { revenue: 4_700_000_000, netIncome: 1_800_000_000, calendarYear: "2024", grossProfit: 3_290_000_000, operatingIncome: 1_880_000_000 },
  { revenue: 3_300_000_000, netIncome: 400_000_000, calendarYear: "2023", grossProfit: 2_145_000_000, operatingIncome: 660_000_000 },
  { revenue: 2_800_000_000, netIncome: -170_000_000, calendarYear: "2022", grossProfit: 1_680_000_000, operatingIncome: -56_000_000 },
];

export const DEV_DESCRIPTION = "AppLovin Corporation provides a software-based platform for mobile app developers to enhance the marketing and monetization of their apps. The company's core product, AppDiscovery, uses AI-driven advertising to help developers acquire users, while MAX is an in-app bidding solution that optimizes ad revenue.";

/** Raw (unwinsorized) YoY EPS growth — shows the extreme swings. */
export const DEV_EPS_GROWTH_HISTORY: EpsGrowthPoint[] = [
  { year: "2025", growth: 0.224 },     //  +22.4%  — normal
  { year: "2024", growth: 3.504 },     // +350.4%  — explosion from low base
  { year: "2023", growth: 3.327 },     // +332.7%  — turnaround from loss year
  { year: "2022", growth: -2.156 },    // -215.6%  — swung to a loss
  { year: "2021", growth: 3.50 },      // +350.0%  — from near-zero ($0.10 → $0.45)
  { year: "2020", growth: 1.667 },     // +166.7%  — emerged from losses
  { year: "2019", growth: -1.50 },     // -150.0%  — deepened losses
];

export const DEV_GROWTH_VALUES = { g5: 96, g10: 96 };

export const DEV_GROWTH_YEARS = { short: 5, long: 7 };

export const DEV_SCENARIO_VALUES = {
  bear: { y1: 15, y2: 10, cagr: 12 },
  base: { y1: 28, y2: 22, cagr: 25 },
  bull: { y1: 40, y2: 32, cagr: 35 },
};
