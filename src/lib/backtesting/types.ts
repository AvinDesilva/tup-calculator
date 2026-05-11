import type { VerdictKey, InputState } from "../types.ts";

export interface BacktestSnapshot {
  year: number;
  fiscalYearEndDate: string;       // "YYYY-MM-DD"
  snapshotPrice: number;
  eps: number;
  shares: number;
  marketCap: number;
  debtAvailable: boolean;          // false = balance sheet missing for this year
  historicalCAGR: number;          // % (e.g. 12 = 12%)
  fwdGrowthY1: number;             // % — actual Y→Y+1 EPS growth (analyst proxy)
  fwdGrowthY2: number | null;      // % — actual Y+1→Y+2 EPS growth
  sma200: number;
  inputState: InputState;
}

export interface BacktestRow {
  snapshot: BacktestSnapshot;
  // TUP signal
  verdict: VerdictKey;
  paybackYears: number | null;
  adjPrice: number;
  epsBase: number | null;
  grTerminal: number | null;    // decimal (0.12 = 12%)
  fallingKnife: boolean;
  // Forward performance
  return3yr: number | null;
  return5yr: number | null;
  return7yr: number | null;
  spyReturn3yr: number | null;
  spyReturn5yr: number | null;
  spyReturn7yr: number | null;
  alpha3yr: number | null;
  alpha5yr: number | null;
  alpha7yr: number | null;
  // Risk / accuracy
  maxDrawdown3yr: number | null;   // negative %, e.g. -35.2
  earningsAccuracy: number | null; // 0–1 score
  isPartial: boolean;              // some forward windows missing
}

export interface BacktestSummary {
  totalSnapshots: number;
  buySignals: number;
  winRate5yr: number | null;       // % of buy signals with positive 5yr alpha
  avgAlpha5yr: number | null;
  avgPayback: number | null;
}

export type BacktestStage =
  | "idle"
  | "fetching"
  | "computing"
  | "done"
  | "error";

export interface BacktestState {
  stage: BacktestStage;
  rows: BacktestRow[];
  summary: BacktestSummary | null;
  error: string | null;
  spyUnavailable: boolean;
}
