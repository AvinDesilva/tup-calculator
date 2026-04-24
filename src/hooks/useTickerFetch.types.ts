import type { InputState, GrowthScenario, RollFilters, FMPCashFlow, FMPIncomeStatement, FMPBalanceSheet, EpsGrowthPoint, HistoricalPricePoint } from "../lib/types.ts";
import type { GuruRadarData } from "../lib/guruRadar/types.ts";
import type { InsiderTradingData } from "../lib/insiderTrading/types.ts";

export interface ValuationState {
  insiderTrading: InsiderTradingData | null;
  insiderTradingLoading: boolean;
  insiderTradingFetchedAt: number; // ms timestamp captured in async callback, not render
}

export interface ScorecardState {
  cashFlows: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
  balanceSheetHistory: FMPBalanceSheet[];
  epsGrowthHistory: EpsGrowthPoint[];
  description: string;
}

export interface UseTickerFetchReturn {
  // Search / dice UI
  ticker: string;
  setTicker: (v: string) => void;
  loading: boolean;
  error: string;
  fetchLog: string[];
  rollingDice: boolean;
  dicePhrase: string;
  isFilterOpen: boolean;
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rollFilters: RollFilters;
  setRollFilters: React.Dispatch<React.SetStateAction<RollFilters>>;
  hasActiveFilters: boolean;

  // Actions
  doFetch: (tickerOverride?: string) => Promise<number | null>;
  rollDice: () => Promise<void>;
  cancelDice: () => void;
  resetSearch: () => void;

  // Fetched data
  company: string;
  meta: { sector: string; industry: string };
  isConverted: boolean;
  currencyNote: string;
  currencyMismatchWarning: string;
  valuation: ValuationState;
  scorecard: ScorecardState;
  hasSearched: boolean;
  strongBuyPrice: number | null;
  buyPrice: number | null;
  guruData: GuruRadarData | null;

  priceHistory: HistoricalPricePoint[];

  // Shared mutable state (set by fetch, also mutated by App UI callbacks)
  inp: InputState;
  setInp: React.Dispatch<React.SetStateAction<InputState>>;
  growthPeriod: "5yr" | "10yr";
  setGrowthPeriod: React.Dispatch<React.SetStateAction<"5yr" | "10yr">>;
  growthScenario: GrowthScenario;
  setGrowthScenario: React.Dispatch<React.SetStateAction<GrowthScenario>>;
  growthValues: { g5: number; g10: number };
  growthYears: { short: number; long: number };
  scenarioValues: Record<GrowthScenario, { y1: number; y2: number | null; cagr: number | null }>;
  hasScenarioData: boolean;
}
