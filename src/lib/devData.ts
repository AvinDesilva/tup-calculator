import type { InputState, FMPEarningSurprise, FMPCashFlow, FMPIncomeStatement } from "./types.ts";

/** Dummy AAPL data for local dev preview — no API key needed. */
export const DEV_TICKER = "AAPL";
export const DEV_COMPANY = "Apple Inc.";
export const DEV_META = { sector: "Technology", industry: "Consumer Electronics" };

export const DEV_INP: InputState = {
  marketCap: 3_540_000_000_000,
  debt: 97_000_000_000,
  cash: 62_000_000_000,
  shares: 15_400_000_000,
  ttmEPS: 6.75,
  forwardEPS: 7.50,
  historicalGrowth: 17,
  analystGrowth: 10,
  fwdGrowthY1: 12,
  fwdGrowthY2: 8,
  fwdCAGR: 10,
  revenuePerShare: 25.5,
  targetMargin: 15,
  inceptionGrowth: 30,
  breakEvenYear: 2,
  currentPrice: 230,
  sma200: 218,
  dividendYield: 0.5,
  lifecycleStage: "mature_stable",
  growthOverrides: {},
  vdrEnabled: true,
};

export const DEV_VALUATION = { dcf: 248, altmanZ: 8.2 };

export const DEV_EARNINGS: FMPEarningSurprise[] = [
  { actualEps: 1.64, estimatedEps: 1.58, date: "2025-09-30" },
  { actualEps: 1.53, estimatedEps: 1.50, date: "2025-06-30" },
  { actualEps: 1.40, estimatedEps: 1.35, date: "2025-03-31" },
  { actualEps: 2.18, estimatedEps: 2.10, date: "2024-12-31" },
  { actualEps: 1.46, estimatedEps: 1.43, date: "2024-09-30" },
  { actualEps: 1.40, estimatedEps: 1.35, date: "2024-06-30" },
  { actualEps: 1.53, estimatedEps: 1.50, date: "2024-03-31" },
  { actualEps: 2.18, estimatedEps: 2.11, date: "2023-12-31" },
];

export const DEV_CASH_FLOWS: FMPCashFlow[] = [
  { operatingCashFlow: 110_000_000_000 },
  { operatingCashFlow: 104_000_000_000 },
  { operatingCashFlow: 99_000_000_000 },
  { operatingCashFlow: 104_000_000_000 },
];

export const DEV_INCOME_HISTORY: FMPIncomeStatement[] = [
  { revenue: 395_000_000_000, netIncome: 97_000_000_000, calendarYear: "2025", grossProfit: 175_000_000_000, operatingIncome: 120_000_000_000 },
  { revenue: 383_000_000_000, netIncome: 94_000_000_000, calendarYear: "2024", grossProfit: 170_000_000_000, operatingIncome: 115_000_000_000 },
  { revenue: 365_000_000_000, netIncome: 90_000_000_000, calendarYear: "2023", grossProfit: 162_000_000_000, operatingIncome: 110_000_000_000 },
  { revenue: 394_000_000_000, netIncome: 100_000_000_000, calendarYear: "2022", grossProfit: 171_000_000_000, operatingIncome: 119_000_000_000 },
];

export const DEV_DESCRIPTION = "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, Mac, iPad, and wearables, home, and accessories. It also provides AppleCare support and cloud services, and operates various platforms including the App Store.";

export const DEV_GROWTH_VALUES = { g5: 17, g10: 12 };

export const DEV_GROWTH_YEARS = { short: 5, long: 10 };

export const DEV_SCENARIO_VALUES = {
  bear: { y1: 6, y2: 3, cagr: 4.5 },
  base: { y1: 12, y2: 8, cagr: 10 },
  bull: { y1: 18, y2: 14, cagr: 16 },
};
