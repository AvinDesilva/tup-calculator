import type { VerdictKey, LifecycleStage } from "./types.ts";

// ─── API ──────────────────────────────────────────────────────────────────────
export const FMP = "https://financialmodelingprep.com/stable";

// ─── TUP Thresholds ───────────────────────────────────────────────────────────
export const SAFETY_CAP     = 30;
export const STD_THRESHOLD  = 10;
export const PP_THRESHOLD   = 8;

// ─── Verdict metadata ─────────────────────────────────────────────────────────
export const VERDICT: Record<VerdictKey, { label: string; color: string; icon: string }> = {
  strong_buy: { label: "Strong Buy",  color: "#10d97e", icon: "▲▲" },
  buy:        { label: "Buy",         color: "#00BFA5", icon: "▲"  },
  hold:       { label: "Hold",        color: "#f5a020", icon: "━"  },
  spec_buy:   { label: "Patient Buy", color: "#f5a020", icon: "→"  },
  avoid:      { label: "Avoid",       color: "#FF4D00", icon: "▼"  },
};

// ─── ADR ratio table ──────────────────────────────────────────────────────────
export const ADR_RATIO_TABLE: Record<string, number> = {
  NVO:  6,
  ASML: 1,
  TSM:  5,
};

// ─── Exchange → listing currency ─────────────────────────────────────────────
export const EXCHANGE_CCY: Record<string, string> = {
  NYSE: "USD", NASDAQ: "USD", AMEX: "USD", NYSEAMERICAN: "USD", BATS: "USD", OTC: "USD",
  TSX: "CAD", TSXV: "CAD",
  LSE: "GBP",
  EURONEXT: "EUR", XETRA: "EUR", FRA: "EUR", EPA: "EUR", AMS: "EUR", BRU: "EUR",
  CPSE: "DKK",
  OMX: "SEK", OSLO: "NOK", HEL: "EUR",
  JPX: "JPY", TSE: "JPY",
  ASX: "AUD",
  HKG: "HKD", HKEX: "HKD",
  SGX: "SGD",
  BSE: "INR", NSE: "INR",
  KRX: "KRW",
};

// ─── Hardcoded FX fallback rates ──────────────────────────────────────────────
export const FALLBACK_FX: Record<string, number> = {
  DKKUSD: 0.145, SEKUSD: 0.091, NOKUSD: 0.091, EURUSD: 1.09,
  CADUSD: 0.74,  GBPUSD: 1.26,  JPYUSD: 0.0067, AUDUSD: 0.63,
  HKDUSD: 0.128, SGDUSD: 0.74,  CHFUSD: 1.11,   CNHUSD: 0.138,
};

// ─── Business Lifecycle S-curve ───────────────────────────────────────────────
export const LC_CURVE: [number, number][] = [
  [0.00, 0.97], [0.06, 0.96], [0.12, 0.93], [0.18, 0.88],
  [0.24, 0.78], [0.30, 0.62], [0.36, 0.42], [0.42, 0.22],
  [0.48, 0.10], [0.54, 0.04], [0.60, 0.03], [0.66, 0.05],
  [0.72, 0.10], [0.78, 0.20], [0.85, 0.36], [0.92, 0.54],
  [1.00, 0.72],
];

// Six equally-spaced lifecycle zones
export const LC_ZONES: Array<{ key: LifecycleStage; label: string; center: number }> = [
  { key: "startup",       label: "Start-Up",      center: 1/12 },
  { key: "young_growth",  label: "Young",          center: 3/12 },
  { key: "high_growth",   label: "High",           center: 5/12 },
  { key: "mature_growth", label: "Mature",         center: 7/12 },
  { key: "mature_stable", label: "Stable",         center: 9/12 },
  { key: "decline",       label: "Decline",        center: 11/12 },
];

// Lifecycle stage → display metadata
export const STAGE_META: Record<LifecycleStage | "other", { label: string; color: string }> = {
  startup:       { label: "Start-Up",       color: "#C4A06E" },
  young_growth:  { label: "Young Growth",   color: "#a8d844" },
  high_growth:   { label: "High Growth",    color: "#10d97e" },
  mature_growth: { label: "Mature Growth",  color: "#00BFA5" },
  mature_stable: { label: "Mature Stable",  color: "#4a90d9" },
  decline:       { label: "Decline",        color: "#FF4D00" },
  other:         { label: "Mixed",          color: "#505050" },
};

// ─── Roll Dice filter constants ─────────────────────────────────────────────

export const GICS_SECTORS = [
  "Technology", "Healthcare", "Financial Services", "Consumer Cyclical",
  "Communication Services", "Industrials", "Consumer Defensive",
  "Energy", "Real Estate", "Utilities", "Basic Materials",
] as const;

export const MKTCAP_RANGES: Record<string, { min: number; max: number }> = {
  Micro: { min: 0, max: 300_000_000 },
  Small: { min: 300_000_000, max: 2_000_000_000 },
  Mid:   { min: 2_000_000_000, max: 10_000_000_000 },
  Large: { min: 10_000_000_000, max: Infinity },
};
