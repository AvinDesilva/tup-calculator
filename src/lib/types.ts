// ─── Domain literals ──────────────────────────────────────────────────────────

export type Mode = "standard" | "preprofit";

export type VerdictKey = "strong_buy" | "buy" | "hold" | "spec_buy" | "avoid";

export type LifecycleStage = "intro" | "growth" | "maturity" | "decline";

// ─── Calculator inputs ────────────────────────────────────────────────────────

export interface InputState {
  marketCap: number;
  debt: number;
  cash: number;
  shares: number;
  ttmEPS: number;
  forwardEPS: number;
  historicalGrowth: number;
  analystGrowth: number;
  revenuePerShare: number;
  targetMargin: number;
  inceptionGrowth: number;
  breakEvenYear: number;
  currentPrice: number;
  sma200: number;
  dividendYield: number;
}

// ─── calcTUP result ───────────────────────────────────────────────────────────

export interface TUPRow {
  year: number;
  annual: number;
  cum: number;
  remaining: number;
}

export interface TUPResult {
  adjPrice: number;
  epsBase: number;
  gr: number;
  threshold: number;
  payback: number | null;
  rows: TUPRow[];
  verdict: VerdictKey;
  fallingKnife: boolean;
  tamWarning: boolean;
  startYr: number;
  sma200: number;
}

// ─── FMP API response shapes (all fields optional — FMP returns partial data) ─

export interface FMPProfile {
  exchangeShortName?: string;
  exchange?: string;
  currency?: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  mktCap?: number;
  lastDiv?: number;
  price?: number;
}

export interface FMPQuote {
  eps?: number;
  sharesOutstanding?: number;
  priceAvg200?: number;
  dividendYield?: number;
  price?: number;
  marketCap?: number;
}

export interface FMPBalanceSheet {
  totalDebt?: number;
  longTermDebt?: number;
  cashAndCashEquivalents?: number;
  cashAndShortTermInvestments?: number;
  totalAssets?: number;
  totalCurrentAssets?: number;
  totalCurrentLiabilities?: number;
  retainedEarnings?: number;
  totalLiabilities?: number;
}

export interface FMPIncomeStatement {
  reportingCurrency?: string;
  revenue?: number;
  netIncome?: number;
  calendarYear?: string | number;
  date?: string;
  weightedAverageShsOut?: number;
  weightedAverageShsOutDil?: number;
  operatingIncome?: number;
  grossProfit?: number;
}

export interface FMPFinancialGrowth {
  epsgrowth?: number;
  calendarYear?: string | number;
  date?: string;
}

export interface FMPEstimate {
  date?: string;
  epsAvg?: number;
  revenueAvg?: number;
}

export interface FMPKeyMetrics {
  priceToEarningsToGrowthRatio?: number;
  pegRatio?: number;
  dividendYieldTTM?: number;
  dividendYield?: number;
}

export interface FMPDividend {
  adjDividend?: number;
  dividend?: number;
  frequency?: string;
  date?: string;
}

export interface FMPDividendHistory {
  historical?: FMPDividend[];
}

export interface FMPDCF {
  dcf?: number;
}

export interface FMPEarningSurprise {
  actualEarningResult?: number;
  actualEps?: number;
  estimatedEarning?: number;
  estimatedEps?: number;
  date?: string;
}

export interface FMPCashFlow {
  operatingCashFlow?: number;
  netCashProvidedByOperatingActivities?: number;
}

// ─── lookupTicker return ──────────────────────────────────────────────────────

export interface TickerData {
  companyName: string;
  ticker: string;
  sector: string;
  industry: string;
  marketCap: number;
  debt: number;
  cash: number;
  shares: number;
  ttmEPS: number;
  forwardEPS: number;
  historicalGrowth: number;
  analystGrowth: number;
  revenuePerShare: number;
  targetMargin: number;
  inceptionGrowth: number;
  breakEvenYear: number;
  currentPrice: number;
  sma200: number;
  dividendYield: number;
  divNote: string;
  peterLynchRatio: number | null;
  dcfValue: number | null;
  altmanZ: number | null;
  piotroski: number | null;
  isConverted: boolean;
  currencyNote: string;
  currencyMismatchWarning: string;
  earningsSurprises: FMPEarningSurprise[];
  cashFlowHistory: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
}
