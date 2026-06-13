"use strict";

/**
 * TUP (Time Until Payback) calculation engine — server-side port.
 *
 * This mirrors src/lib/verdictCard/calcTUP.ts and src/lib/companyScorecard/vdr.ts
 * for use in the MCP server without any frontend dependencies.
 */

// ─── Constants ───────────────────────────────────────────────────────────────
const SAFETY_CAP = 30;
const STD_THRESHOLD = 10;
const PP_THRESHOLD = 8;

const VERDICT_LABELS = {
  strong_buy: "Deeply Discounted",
  buy: "Fairly Priced",
  hold: "Stretched",
  stretched: "Fully Priced",
  spec_buy: "Discounted (Falling Knife)",
  avoid: "Priced for Perfection",
};

// ─── VDR (Variable Decay Rate) ──────────────────────────────────────────────
const HOLD_PERIOD = {
  startup: 7, young_growth: 5, high_growth: 3,
  mature_growth: 5, mature_stable: 3, decline: 3,
};

const MIN_VDR = 0.02;
const BASE_FADE_FLOOR = 0.05;

function vdrFactor(initial) {
  if (initial >= 0.40) return 0.20;
  if (initial >= 0.20) return 0.15;
  return 0.10;
}

function marginModifier(opMargin) {
  if (opMargin == null) return 1.0;
  if (opMargin >= 20) return 0.8;
  if (opMargin >= 10) return 1.0;
  if (opMargin >= 5) return 1.1;
  return 1.2;
}

function profitabilityModifier(ttmEPS) {
  return ttmEPS <= 0 ? 1.25 : 1.0;
}

function dynamicFloor(dividendYield) {
  return Math.max(dividendYield / 100, BASE_FADE_FLOOR);
}

function fadedGrowth(initial, year, ctx) {
  const floor = dynamicFloor(ctx.dividendYield);
  if (initial <= floor) return initial;
  const hold = ctx.stage ? HOLD_PERIOD[ctx.stage] || 0 : 0;
  if (year <= hold) return initial;
  const mMod = marginModifier(ctx.operatingMargin);
  const pMod = profitabilityModifier(ctx.ttmEPS);
  const vdr = Math.max(MIN_VDR, initial * vdrFactor(initial) * mMod * pMod);
  const decay = (year - hold) * vdr;
  return Math.max(initial - decay, floor);
}

// ─── Core calculation ────────────────────────────────────────────────────────
function calcTUP(inp) {
  const mode = inp.ttmEPS > 0 ? "standard" : "preprofit";
  const {
    marketCap, debt, cash, shares, ttmEPS, forwardEPS,
    historicalGrowth, analystGrowth, fwdGrowthY1, fwdGrowthY2,
    revenuePerShare, targetMargin,
    inceptionGrowth, breakEvenYear, currentPrice, sma200, dividendYield,
    operatingMargin, lifecycleStage,
  } = inp;

  if (!shares || shares <= 0) return null;

  const adjPrice = (marketCap + debt - cash) / shares;
  let epsBase, threshold, startYr;
  let grTerminal;

  const divBonus = (dividendYield || 0) / 100;

  if (mode === "standard") {
    epsBase = (ttmEPS + forwardEPS) / 2;
    threshold = STD_THRESHOLD;
    startYr = 1;

    const histRate = historicalGrowth / 100;
    let fwd1Rate = fwdGrowthY1 / 100;
    let fwd2Rate = fwdGrowthY2 != null ? fwdGrowthY2 / 100 : fwd1Rate;

    if (epsBase <= 0) {
      fwd1Rate = histRate;
      fwd2Rate = histRate;
    }

    const histBlended = (histRate + fwd1Rate) / 2;
    const fwdProduct = (1 + fwd1Rate) * (1 + fwd2Rate);
    const fwdCompoundCAGR = fwdProduct > 0
      ? Math.sqrt(fwdProduct) - 1
      : (fwd1Rate + fwd2Rate) / 2;

    grTerminal = (histBlended + fwdCompoundCAGR) / 2 + divBonus;
  } else {
    epsBase = revenuePerShare * (targetMargin / 100);
    threshold = PP_THRESHOLD;
    startYr = Math.max(1, breakEvenYear || 1);
    grTerminal = ((inceptionGrowth + analystGrowth) / 2 + (dividendYield || 0)) / 100;
  }

  const gr = grTerminal;

  let paybackNote = null;
  if (adjPrice < 0) {
    paybackNote = "Adjusted share price is negative — cash exceeds enterprise value.";
  } else if (gr < 0) {
    paybackNote = "Growth rate is negative — earnings are declining.";
  }

  const fallingKnife = currentPrice > 0 && sma200 > 0 && currentPrice < sma200;

  // VDR context
  const vdrCtx = {
    stage: lifecycleStage || null,
    operatingMargin: operatingMargin || null,
    dividendYield: dividendYield || 0,
    ttmEPS,
  };

  // Year-by-year accumulation
  const rows = [];
  let cum = 0, eps = epsBase, payback = null;
  for (let y = 1; y <= SAFETY_CAP; y++) {
    const yearGr = fadedGrowth(grTerminal, y, vdrCtx);
    eps *= (1 + yearGr);
    const annual = y >= startYr ? eps : 0;
    cum += annual;
    rows.push({ year: y, growthRate: +(yearGr * 100).toFixed(2), annual: +annual.toFixed(2), cum: +cum.toFixed(2), remaining: +Math.max(0, adjPrice - cum).toFixed(2) });
    if (cum >= adjPrice && !payback) payback = y;
  }

  if (paybackNote) payback = null;

  // Verdict
  let fundamentalVerdict;
  if (!payback || payback > SAFETY_CAP) fundamentalVerdict = "avoid";
  else if (payback <= threshold * 0.7) fundamentalVerdict = "strong_buy";
  else if (payback <= threshold * 0.9) fundamentalVerdict = "buy";
  else if (payback <= threshold * 1.2) fundamentalVerdict = "hold";
  else if (payback <= threshold * 1.5) fundamentalVerdict = "stretched";
  else fundamentalVerdict = "avoid";

  let verdict;
  if (fallingKnife && (fundamentalVerdict === "strong_buy" || fundamentalVerdict === "buy")) {
    verdict = "spec_buy";
  } else if (fallingKnife) {
    verdict = "avoid";
  } else {
    verdict = fundamentalVerdict;
  }

  return {
    mode,
    adjPrice: +adjPrice.toFixed(2),
    epsBase: +epsBase.toFixed(4),
    blendedGrowthRate: +(gr * 100).toFixed(2),
    threshold,
    paybackYears: payback,
    paybackNote,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    fallingKnife,
    currentPrice,
    sma200,
    rows,
  };
}

module.exports = { calcTUP, VERDICT_LABELS };
