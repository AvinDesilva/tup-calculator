import type { IndustryGrowthData } from "../lib/api.ts";
import type { InputState, GrowthScenario, RollFilters, FMPEarningSurprise, FMPCashFlow, FMPIncomeStatement, EpsGrowthPoint } from "../lib/types.ts";

export interface ValuationState {
  dcf: number | null;
  industryGrowth: IndustryGrowthData | null;
  industryGrowthLoading: boolean;
}

export interface ScorecardState {
  earnings: FMPEarningSurprise[];
  cashFlows: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
  epsGrowthHistory: EpsGrowthPoint[];
  description: string;
  exchange: string;
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
