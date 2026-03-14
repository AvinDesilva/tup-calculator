import { SAFETY_CAP, STD_THRESHOLD, PP_THRESHOLD } from "./constants.ts";
import type { InputState, Mode, TUPResult, TUPRow, VerdictKey, LifecycleStage } from "./types.ts";

/**
 * Lifecycle Fade with Variable Decay Rate (VDR).
 *
 * Hold periods by stage:
 *   Start-Up: 7yr, Young Growth: 5yr, High Growth: 3yr,
 *   Mature Growth: 1yr, Mature Stable: 0yr, Decline: 0yr
 *
 * After the hold period, growth decays annually:
 *   VDR = max(0.05, G_initial × 0.20)
 *   G(n) = max(G_initial − (n − HoldPeriod) × VDR, 0.30)
 *
 * Hyper-growth companies (e.g. 70% → VDR ≈ 14%) decay aggressively,
 * while moderate growers (e.g. 30% → VDR = 6%) fade more gracefully.
 */
const HOLD_PERIOD: Record<LifecycleStage, number> = {
  startup: 7, young_growth: 5, high_growth: 3, mature_growth: 1, mature_stable: 0, decline: 0,
};
const MIN_VDR    = 0.05;   // minimum 5pp/yr decay (as decimal)
const VDR_FACTOR = 0.20;   // VDR = 20% of initial growth rate
const FADE_FLOOR = 0.30;   // 30% growth floor (as decimal)

function fadedGrowth(initial: number, year: number, stage: LifecycleStage | null): number {
  if (initial <= FADE_FLOOR) return initial;          // already at or below floor
  const hold = stage ? HOLD_PERIOD[stage] : 0;
  if (year <= hold) return initial;                   // hold period — full rate
  const vdr   = Math.max(MIN_VDR, initial * VDR_FACTOR);
  const decay = (year - hold) * vdr;
  return Math.max(initial - decay, FADE_FLOOR);
}

/**
 * Core TUP (Time Until Payback) calculation engine.
 *
 * Computes how many years of compounded EPS growth it takes to recover the
 * adjusted share price (enterprise value per share).
 */
export function calcTUP(inp: InputState, mode: Mode): TUPResult | null {
  const {
    marketCap, debt, cash, shares, ttmEPS, forwardEPS,
    historicalGrowth, analystGrowth, fwdGrowthY1, fwdGrowthY2, fwdCAGR,
    revenuePerShare, targetMargin,
    inceptionGrowth, breakEvenYear, currentPrice, sma200, dividendYield,
    lifecycleStage, growthOverrides,
  } = inp;

  if (!shares || shares <= 0) return null;

  const adjPrice = (marketCap + debt - cash) / shares;
  let epsBase: number, threshold: number, startYr: number;
  let grY1: number, grY2: number, grTerminal: number;

  const divBonus = (dividendYield || 0) / 100;

  if (mode === "standard") {
    epsBase   = (ttmEPS + forwardEPS) / 2;
    threshold = STD_THRESHOLD;
    startYr   = 1;

    const histRate = historicalGrowth / 100;
    let fwd1Rate   = fwdGrowthY1 / 100;
    let fwd2Rate   = fwdGrowthY2 != null ? fwdGrowthY2 / 100 : fwd1Rate;
    let fwdCagrRate: number | null = fwdCAGR != null ? fwdCAGR / 100 : null;

    // Fallback: if baselineEPS <= 0, default all forward components to histCAGR
    if (epsBase <= 0) {
      fwd1Rate    = histRate;
      fwd2Rate    = histRate;
      fwdCagrRate = null;
    }

    grY1       = fwd1Rate + divBonus;
    grY2       = fwd2Rate + divBonus;
    grTerminal = fwdCagrRate != null
      ? (histRate + fwdCagrRate) / 2 + divBonus
      : histRate + divBonus;
  } else {
    epsBase    = revenuePerShare * (targetMargin / 100);
    threshold  = PP_THRESHOLD;
    startYr    = Math.max(1, breakEvenYear || 1);

    const uniformGr = ((inceptionGrowth + analystGrowth) / 2 + (dividendYield || 0)) / 100;
    grY1       = uniformGr;
    grY2       = uniformGr;
    grTerminal = uniformGr;
  }

  const gr = grTerminal;

  const fallingKnife = currentPrice > 0 && sma200 > 0 && currentPrice < sma200;
  const impliedRev10 = revenuePerShare * shares * Math.pow(1 + gr, 10);
  const tamWarning   = impliedRev10 > 5e12;

  // Year-by-year accumulation with variable growth rates + lifecycle fade
  const rows: TUPRow[] = [];
  let cum = 0, eps = epsBase, payback: number | null = null;
  for (let y = 1; y <= SAFETY_CAP; y++) {
    let yearGr: number;
    if (growthOverrides && growthOverrides[y] !== undefined) {
      yearGr = growthOverrides[y] / 100;
    } else if (y === 1) {
      yearGr = grY1;
    } else if (y === 2) {
      yearGr = grY2;
    } else {
      yearGr = fadedGrowth(grTerminal, y, lifecycleStage);
    }
    eps *= (1 + yearGr);
    const annual = y >= startYr ? eps : 0;
    cum += annual;
    rows.push({ year: y, growthRate: yearGr * 100, annual, cum, remaining: Math.max(0, adjPrice - cum) });
    if (cum >= adjPrice && !payback) payback = y;
  }

  // Fundamental verdict (ignoring technical signal)
  let fundamentalVerdict: VerdictKey;
  if (!payback || payback > SAFETY_CAP) fundamentalVerdict = "avoid";
  else if (payback <= threshold * 0.6)  fundamentalVerdict = "strong_buy";
  else if (payback <= threshold)        fundamentalVerdict = "buy";
  else if (payback <= threshold * 1.3)  fundamentalVerdict = "hold";
  else                                  fundamentalVerdict = "avoid";

  // Apply falling knife: buy math + price below SMA → speculative
  let verdict: VerdictKey;
  if (fallingKnife && (fundamentalVerdict === "strong_buy" || fundamentalVerdict === "buy")) {
    verdict = "spec_buy";
  } else if (fallingKnife) {
    verdict = "avoid";
  } else {
    verdict = fundamentalVerdict;
  }

  return { adjPrice, epsBase, gr, grY1, grY2, grTerminal, threshold, payback, rows, verdict, fallingKnife, tamWarning, startYr, sma200 };
}
