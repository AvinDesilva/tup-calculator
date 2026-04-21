import type { InputState, FMPCashFlow, FMPIncomeStatement, EpsGrowthPoint } from "./types.ts";
import type { InsiderTradingData } from "./insiderTrading/types.ts";

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
  decayMode: "ff",
};

const DEV_INSIDER_TRADING: InsiderTradingData = {
  trades: [
    {
      symbol: "APP", filingDate: "2025-03-15", transactionDate: "2025-03-14",
      reportingName: "Kramer Adam", reportingCik: "0001234501", companyCik: "0009999", typeOfOwner: "officer: CEO",
      acquisitionOrDisposition: "A", transactionType: "P-Purchase",
      securitiesOwned: 500000, securitiesTransacted: 25000, price: 312.5, securityName: "Common Stock", url: "", formType: "4",
      totalValue: 7812500, isBuy: true,
      flags: { discretionary: false, clusterSell: false, clusterIncludesCFO: false, likelyNon10b51: false },
    },
    {
      symbol: "APP", filingDate: "2025-02-20", transactionDate: "2025-02-19",
      reportingName: "Huang David", reportingCik: "0001234502", companyCik: "0009999", typeOfOwner: "officer: VP Engineering",
      acquisitionOrDisposition: "D", transactionType: "S-Sale",
      securitiesOwned: 180000, securitiesTransacted: 40000, price: 328.0, securityName: "Common Stock", url: "", formType: "4",
      totalValue: 13120000, isBuy: false,
      flags: { discretionary: true, clusterSell: true, clusterIncludesCFO: true, likelyNon10b51: true },
    },
    {
      symbol: "APP", filingDate: "2025-02-18", transactionDate: "2025-02-17",
      reportingName: "Chen Sarah", reportingCik: "0001234503", companyCik: "0009999", typeOfOwner: "officer: CFO",
      acquisitionOrDisposition: "D", transactionType: "S-Sale",
      securitiesOwned: 90000, securitiesTransacted: 15000, price: 325.0, securityName: "Common Stock", url: "", formType: "4",
      totalValue: 4875000, isBuy: false,
      flags: { discretionary: true, clusterSell: true, clusterIncludesCFO: true, likelyNon10b51: true },
    },
    {
      symbol: "APP", filingDate: "2025-02-15", transactionDate: "2025-02-14",
      reportingName: "Patel Raj", reportingCik: "0001234504", companyCik: "0009999", typeOfOwner: "director",
      acquisitionOrDisposition: "D", transactionType: "S-Sale",
      securitiesOwned: 60000, securitiesTransacted: 8000, price: 321.0, securityName: "Common Stock", url: "", formType: "4",
      totalValue: 2568000, isBuy: false,
      flags: { discretionary: true, clusterSell: true, clusterIncludesCFO: true, likelyNon10b51: true },
    },
    {
      symbol: "APP", filingDate: "2025-01-10", transactionDate: "2025-01-09",
      reportingName: "Miller James", reportingCik: "0001234505", companyCik: "0009999", typeOfOwner: "officer: VP Sales",
      acquisitionOrDisposition: "D", transactionType: "F-InKind",
      securitiesOwned: 220000, securitiesTransacted: 5200, price: 298.0, securityName: "Common Stock", url: "", formType: "4",
      totalValue: 1549600, isBuy: false,
      flags: { discretionary: false, clusterSell: false, clusterIncludesCFO: false, likelyNon10b51: false },
    },
    {
      symbol: "APP", filingDate: "2024-12-05", transactionDate: "2024-12-04",
      reportingName: "Lee Jessica", reportingCik: "0001234506", companyCik: "0009999", typeOfOwner: "director",
      acquisitionOrDisposition: "A", transactionType: "P-Purchase",
      securitiesOwned: 45000, securitiesTransacted: 10000, price: 280.0, securityName: "Common Stock", url: "", formType: "4",
      totalValue: 2800000, isBuy: true,
      flags: { discretionary: false, clusterSell: false, clusterIncludesCFO: false, likelyNon10b51: false },
    },
  ],
  summary: {
    totalBuys: 2,
    totalSells: 4,
    discretionarySells: 3,
    clusterAlert: true,
    netDirection: "selling",
  },
};

export const DEV_VALUATION = {
  insiderTrading: DEV_INSIDER_TRADING,
  insiderTradingLoading: false,
};


export const DEV_CASH_FLOWS: FMPCashFlow[] = [
  { operatingCashFlow: 2_800_000_000, freeCashFlow: 2_600_000_000 },
  { operatingCashFlow: 2_000_000_000, freeCashFlow: 1_850_000_000 },
  { operatingCashFlow: 900_000_000,   freeCashFlow: 800_000_000 },
  { operatingCashFlow: 500_000_000,   freeCashFlow: 400_000_000 },
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

// Derived ratio fields for GuruRadar dev mode (realistic APP values)
export const DEV_DERIVED_RATIOS = {
  beta: 1.8,
  currentRatio: 1.6,
  debtToEquity: 1.2,
  returnOnEquity: 0.38,
  returnOnAssets: 0.18,
  grossMargin: 0.70,
  profitMargin: 0.40,
  bookValuePerShare: 4.20,
  peRatio: 59,
  pbRatio: 93.8,
  freeCashFlowPerShare: 7.88,
};

export const DEV_GROWTH_VALUES = { g5: 96, g10: 96 };

export const DEV_GROWTH_YEARS = { short: 5, long: 7 };

export const DEV_SCENARIO_VALUES = {
  bear: { y1: 15, y2: 10, cagr: 12 },
  base: { y1: 28, y2: 22, cagr: 25 },
  bull: { y1: 40, y2: 32, cagr: 35 },
};
