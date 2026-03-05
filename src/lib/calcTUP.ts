import { SAFETY_CAP, STD_THRESHOLD, PP_THRESHOLD } from "./constants.ts";
import type { InputState, Mode, TUPResult, TUPRow, VerdictKey } from "./types.ts";

/**
 * Core TUP (Time Until Payback) calculation engine.
 *
 * Computes how many years of compounded EPS growth it takes to recover the
 * adjusted share price (enterprise value per share).
 */
export function calcTUP(inp: InputState, mode: Mode): TUPResult | null {
  const {
    marketCap, debt, cash, shares, ttmEPS, forwardEPS,
    historicalGrowth, analystGrowth, revenuePerShare, targetMargin,
    inceptionGrowth, breakEvenYear, currentPrice, sma200, dividendYield,
  } = inp;

  if (!shares || shares <= 0) return null;

  const adjPrice = (marketCap + debt - cash) / shares;
  let epsBase: number, gr: number, threshold: number, startYr: number;

  if (mode === "standard") {
    epsBase    = (ttmEPS + forwardEPS) / 2;
    gr         = ((historicalGrowth + analystGrowth) / 2 + (dividendYield || 0)) / 100;
    threshold  = STD_THRESHOLD;
    startYr    = 1;
  } else {
    epsBase    = revenuePerShare * (targetMargin / 100);
    gr         = ((inceptionGrowth + analystGrowth) / 2 + (dividendYield || 0)) / 100;
    threshold  = PP_THRESHOLD;
    startYr    = Math.max(1, breakEvenYear || 1);
  }

  const fallingKnife = currentPrice > 0 && sma200 > 0 && currentPrice < sma200;
  const impliedRev10 = revenuePerShare * shares * Math.pow(1 + gr, 10);
  const tamWarning   = impliedRev10 > 5e12;

  // Year-by-year accumulation loop
  const rows: TUPRow[] = [];
  let cum = 0, eps = epsBase, payback: number | null = null;
  for (let y = 1; y <= SAFETY_CAP; y++) {
    if (y > 1) eps *= (1 + gr);
    const annual = y >= startYr ? eps : 0;
    cum += annual;
    rows.push({ year: y, annual, cum, remaining: Math.max(0, adjPrice - cum) });
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

  return { adjPrice, epsBase, gr, threshold, payback, rows, verdict, fallingKnife, tamWarning, startYr, sma200 };
}
