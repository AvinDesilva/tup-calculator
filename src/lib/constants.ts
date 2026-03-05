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
  [0.00, 0.97], [0.07, 0.96], [0.15, 0.93], [0.22, 0.88],
  [0.28, 0.80], [0.35, 0.66], [0.42, 0.46], [0.50, 0.25],
  [0.57, 0.09], [0.63, 0.04], [0.68, 0.05], [0.74, 0.13],
  [0.81, 0.30], [0.89, 0.52], [1.00, 0.72],
];

// Four equally-spaced lifecycle zones
export const LC_ZONES: Array<{ key: LifecycleStage; label: string; center: number }> = [
  { key: "intro",    label: "Introduction", center: 0.125 },
  { key: "growth",   label: "Growth",       center: 0.375 },
  { key: "maturity", label: "Maturity",     center: 0.625 },
  { key: "decline",  label: "Decline",      center: 0.875 },
];

// Lifecycle stage → display metadata
export const STAGE_META: Record<LifecycleStage | "other", { label: string; color: string }> = {
  intro:    { label: "Introduction", color: "#C4A06E" },
  growth:   { label: "Growth",       color: "#10d97e" },
  maturity: { label: "Maturity",     color: "#00BFA5" },
  decline:  { label: "Decline",      color: "#FF4D00" },
  other:    { label: "Mixed",        color: "#505050" },
};
