import { SAFETY_CAP, STD_THRESHOLD, PP_THRESHOLD } from "./constants.ts";
import type { InputState, Mode, TUPResult, TUPRow, VerdictKey } from "./types.ts";
import { fadedGrowth, fixedFrictionGrowth, type VDRContext } from "./vdr.ts";

/**
 * Core TUP (Time Until Payback) calculation engine.
 *
 * Computes how many years of compounded EPS growth it takes to recover the
 * adjusted share price (enterprise value per share).
 */
export function calcTUP(inp: InputState, mode: Mode, targetPriceOverride?: number): TUPResult | null {
  const {
    marketCap, debt, cash, shares, ttmEPS, forwardEPS,
    historicalGrowth, analystGrowth, fwdGrowthY1, fwdGrowthY2,
    revenuePerShare, targetMargin,
    inceptionGrowth, breakEvenYear, currentPrice, sma200, dividendYield,
    operatingMargin, lifecycleStage, growthOverrides, decayMode,
  } = inp;

  if (!shares || shares <= 0) return null;

  const adjPrice = (marketCap + debt - cash) / shares;
  const paybackTarget = (targetPriceOverride != null && targetPriceOverride > 0)
    ? targetPriceOverride
    : adjPrice;
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

    // Fallback: if baselineEPS <= 0, default all forward components to histCAGR
    if (epsBase <= 0) {
      fwd1Rate = histRate;
      fwd2Rate = histRate;
    }

    grY1 = fwd1Rate + divBonus;
    grY2 = fwd2Rate + divBonus;

    // Historical Blended: anchor past CAGR with Y1 forward outlook
    const histBlended = (histRate + fwd1Rate) / 2;

    // Forward Compound CAGR: geometric mean of Y1 and Y2 rates
    const fwdProduct = (1 + fwd1Rate) * (1 + fwd2Rate);
    const fwdCompoundCAGR = fwdProduct > 0
      ? Math.sqrt(fwdProduct) - 1
      : (fwd1Rate + fwd2Rate) / 2;  // fallback for extreme negatives

    grTerminal = (histBlended + fwdCompoundCAGR) / 2 + divBonus;
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

  // Detect edge cases that make the payback calculation meaningless
  let paybackNote: string | null = null;
  if (paybackTarget < 0) {
    paybackNote = "Adjusted share price is negative — cash exceeds enterprise value, so payback cannot be calculated.";
  } else if (gr < 0) {
    paybackNote = "Growth rate is negative — earnings are declining, so payback cannot be calculated.";
  }

  const fallingKnife = currentPrice > 0 && sma200 > 0 && currentPrice < sma200;
  const impliedRev10 = revenuePerShare * shares * Math.pow(1 + gr, 10);
  const tamWarning   = impliedRev10 > 5e12;

  // Build VDR context for multi-factor lifecycle fade
  const vdrCtx: VDRContext = {
    stage: lifecycleStage,
    operatingMargin,
    dividendYield,
    ttmEPS,
  };

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
      yearGr = decayMode === "vdr" ? fadedGrowth(grTerminal, y, vdrCtx)
             : decayMode === "ff"  ? fixedFrictionGrowth(grTerminal, y, vdrCtx)
             : grTerminal;
    }
    eps *= (1 + yearGr);
    const annual = y >= startYr ? eps : 0;
    cum += annual;
    rows.push({ year: y, growthRate: yearGr * 100, annual, cum, remaining: Math.max(0, paybackTarget - cum) });
    if (cum >= paybackTarget && !payback) payback = y;
  }

  // Override payback to null when calculation is meaningless
  if (paybackNote) payback = null;

  // Fundamental verdict (ignoring technical signal)
  let fundamentalVerdict: VerdictKey;
  if (!payback || payback > SAFETY_CAP) fundamentalVerdict = "avoid";
  else if (payback <= threshold * 0.7)  fundamentalVerdict = "strong_buy";
  else if (payback <= threshold * 0.9)  fundamentalVerdict = "buy";
  else if (payback <= threshold * 1.2)  fundamentalVerdict = "hold";
  else if (payback <= threshold * 1.5)  fundamentalVerdict = "stretched";
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

  return { adjPrice, epsBase, gr, grY1, grY2, grTerminal, threshold, payback, paybackNote, rows, verdict, fallingKnife, tamWarning, startYr, sma200 };
}
