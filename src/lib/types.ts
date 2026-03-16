// ─── Domain literals ──────────────────────────────────────────────────────────

export type Mode = "standard" | "preprofit";

export type GrowthScenario = "bear" | "base" | "bull";

export type VerdictKey = "strong_buy" | "buy" | "hold" | "spec_buy" | "avoid";

export type LifecycleStage = "startup" | "young_growth" | "high_growth" | "mature_growth" | "mature_stable" | "decline";

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
  fwdGrowthY1: number;
  fwdGrowthY2: number | null;
  fwdCAGR: number | null;
  revenuePerShare: number;
  targetMargin: number;
  inceptionGrowth: number;
  breakEvenYear: number;
  currentPrice: number;
  sma200: number;
  dividendYield: number;
  operatingMargin: number | null;
  lifecycleStage: LifecycleStage | null;
  growthOverrides: Record<number, number>;
  vdrEnabled: boolean;
}

// ─── Roll Dice filters ───────────────────────────────────────────────────────

export type MarketCapTier = "All" | "Micro" | "Small" | "Mid" | "Large";

export type ExchangeFilter = "All" | "NYSE" | "NASDAQ" | "OTC" | "LSE" | "TSX";

export interface RollFilters {
  marketCap: MarketCapTier;
  sector: string;
  exchange: ExchangeFilter;
  indexEtf: string;
}

// ─── calcTUP result ───────────────────────────────────────────────────────────

export interface TUPRow {
  year: number;
  growthRate: number;
  annual: number;
  cum: number;
  remaining: number;
}

export interface TUPResult {
  adjPrice: number;
  epsBase: number;
  gr: number;
  grY1: number;
  grY2: number;
  grTerminal: number;
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
  description?: string;
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

export interface FMPEstimate {
  date?: string;
  epsAvg?: number;
  epsHigh?: number;
  epsLow?: number;
  revenueAvg?: number;
  numAnalystsEps?: number;
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

// ─── EPS growth history point ────────────────────────────────────────────────

export interface EpsGrowthPoint {
  year: string;
  growth: number; // decimal, e.g. 0.15 = 15%
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
  historicalGrowth5yr: number;
  epsYearsShort: number;
  epsYearsLong: number;
  analystGrowth: number;
  fwdGrowthY1: number;
  fwdGrowthY2: number | null;
  fwdCAGR: number | null;
  fwdGrowthY1Bear: number | null;
  fwdGrowthY2Bear: number | null;
  fwdCAGRBear: number | null;
  fwdGrowthY1Bull: number | null;
  fwdGrowthY2Bull: number | null;
  fwdCAGRBull: number | null;
  revenuePerShare: number;
  targetMargin: number;
  inceptionGrowth: number;
  breakEvenYear: number;
  currentPrice: number;
  sma200: number;
  dividendYield: number;
  operatingMargin: number | null;
  lifecycleStage: LifecycleStage | null;
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
  epsGrowthHistory: EpsGrowthPoint[];
  description: string;
  exchange: string;
}
