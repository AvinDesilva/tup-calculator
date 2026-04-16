import type { TickerData } from "../types.ts";
import type { GuruScore } from "./types.ts";

function verdict(score: number): "Yes" | "No" | "Maybe" {
  if (score >= 7) return "Yes";
  if (score >= 4) return "Maybe";
  return "No";
}

// Helpers
function g(d: TickerData) {
  const rev0 = d.incomeHistory[0]?.revenue ?? 0;
  const rev1 = d.incomeHistory[1]?.revenue ?? 0;
  const revenueGrowth = rev1 > 0 ? (rev0 - rev1) / rev1 : null;
  const latestEpsGrowth = d.epsGrowthHistory[0]?.growth ?? null;
  const fcfYield = d.freeCashFlowPerShare != null && d.currentPrice > 0
    ? d.freeCashFlowPerShare / d.currentPrice : null;
  return { revenueGrowth, latestEpsGrowth, fcfYield };
}

function buffett(d: TickerData): GuruScore {
  const { fcfYield } = g(d);
  let s = 0;
  if ((d.operatingMargin ?? 0) > 15) s++;
  if (d.returnOnEquity != null && d.returnOnEquity > 0.15) s++;
  if (d.returnOnAssets != null && d.returnOnAssets > 0.10) s++;
  if (d.debtToEquity != null && d.debtToEquity < 0.5) s++;
  if (d.grossMargin != null && d.grossMargin > 0.40) s++;
  if (fcfYield != null && fcfYield > 0.04) s++;
  if (d.piotroski != null && d.piotroski >= 7) s++;
  if (d.currentRatio != null && d.currentRatio > 1.5) s++;
  if (d.profitMargin != null && d.profitMargin > 0.10) s++;
  if ((d.historicalGrowth5yr ?? 0) > 10) s++;
  return { name: "Buffett", verdict: verdict(s), score: s };
}

function lynch(d: TickerData): GuruScore {
  const { revenueGrowth, latestEpsGrowth } = g(d);
  let s = 0;
  if (latestEpsGrowth != null && latestEpsGrowth > 0.10 && latestEpsGrowth < 0.50) s++;
  if (d.peRatio != null && d.peRatio < 30) s++;
  if (d.peterLynchRatio != null && d.peterLynchRatio < 1) s++;
  if (revenueGrowth != null && revenueGrowth > 0.10) s++;
  if (d.debtToEquity != null && d.debtToEquity < 1.0) s++;
  if (d.currentRatio != null && d.currentRatio > 1.0) s++;
  if ((d.operatingMargin ?? 0) > 5) s++;
  if (d.profitMargin != null && d.profitMargin > 0.05) s++;
  if (d.piotroski != null && d.piotroski >= 5) s++;
  if (d.dividendYield >= 0) s++;  // Lynch liked dividend payers but also growth
  return { name: "Lynch", verdict: verdict(s), score: s };
}

function fisher(d: TickerData): GuruScore {
  const { revenueGrowth, latestEpsGrowth } = g(d);
  let s = 0;
  if (revenueGrowth != null && revenueGrowth > 0.15) s++;
  if (latestEpsGrowth != null && latestEpsGrowth > 0.15) s++;
  if (d.grossMargin != null && d.grossMargin > 0.35) s++;
  if (d.returnOnEquity != null && d.returnOnEquity > 0.15) s++;
  if (d.returnOnAssets != null && d.returnOnAssets > 0.08) s++;
  if (d.freeCashFlowPerShare != null && d.freeCashFlowPerShare > 0) s++;
  if (d.piotroski != null && d.piotroski >= 6) s++;
  if ((d.operatingMargin ?? 0) > 10) s++;
  if (d.analystGrowth > 15) s++;
  if (d.debtToEquity != null && d.debtToEquity < 1.5) s++;
  return { name: "Fisher", verdict: verdict(s), score: s };
}

function greenblatt(d: TickerData): GuruScore {
  const { fcfYield } = g(d);
  // Magic Formula: high earnings yield + high return on capital
  const earningsYield = d.peRatio != null && d.peRatio > 0 ? 1 / d.peRatio : null;
  let s = 0;
  if (earningsYield != null && earningsYield > 0.05) s++;
  if (earningsYield != null && earningsYield > 0.10) s++;
  if ((d.operatingMargin ?? 0) > 15) s++;
  if ((d.operatingMargin ?? 0) > 25) s++;
  if (d.returnOnAssets != null && d.returnOnAssets > 0.10) s++;
  if (d.returnOnEquity != null && d.returnOnEquity > 0.20) s++;
  if (fcfYield != null && fcfYield > 0.05) s++;
  if (d.debtToEquity != null && d.debtToEquity < 1.0) s++;
  if (d.piotroski != null && d.piotroski >= 6) s++;
  if (d.peRatio != null && d.peRatio < 25) s++;
  return { name: "Greenblatt", verdict: verdict(s), score: s };
}

function graham(d: TickerData): GuruScore {
  // Deep value / margin of safety
  let s = 0;
  if (d.peRatio != null && d.peRatio < 15) s++;
  if (d.pbRatio != null && d.pbRatio < 1.5) s++;
  if (d.currentRatio != null && d.currentRatio > 2.0) s++;
  if (d.debtToEquity != null && d.debtToEquity < 0.5) s++;
  if (d.dividendYield > 0) s++;
  if (d.piotroski != null && d.piotroski >= 7) s++;
  if (d.ttmEPS > 0) s++;
  if (d.profitMargin != null && d.profitMargin > 0.03) s++;
  if ((d.historicalGrowth5yr ?? 0) > 3) s++;
  if (d.bookValuePerShare != null && d.currentPrice < d.bookValuePerShare * 2) s++;
  return { name: "Graham", verdict: verdict(s), score: s };
}

function templeton(d: TickerData): GuruScore {
  // Contrarian / global value
  const { revenueGrowth } = g(d);
  let s = 0;
  if (d.peRatio != null && d.peRatio < 20) s++;
  if (d.pbRatio != null && d.pbRatio < 2.0) s++;
  if (d.debtToEquity != null && d.debtToEquity < 1.0) s++;
  if (d.piotroski != null && d.piotroski >= 5) s++;
  if (d.dividendYield > 1) s++;
  if (d.profitMargin != null && d.profitMargin > 0.05) s++;
  if (revenueGrowth != null && revenueGrowth > 0.05) s++;
  if (d.returnOnEquity != null && d.returnOnEquity > 0.10) s++;
  if (d.currentRatio != null && d.currentRatio > 1.0) s++;
  if (d.grossMargin != null && d.grossMargin > 0.25) s++;
  return { name: "Templeton", verdict: verdict(s), score: s };
}

function soros(d: TickerData): GuruScore {
  // Momentum / reflexivity
  const { revenueGrowth, latestEpsGrowth } = g(d);
  let s = 0;
  if (revenueGrowth != null && revenueGrowth > 0.15) s++;
  if (latestEpsGrowth != null && latestEpsGrowth > 0.20) s++;
  if (d.analystGrowth > 20) s++;
  if ((d.historicalGrowth5yr ?? 0) > 20) s++;
  if (d.beta != null && d.beta > 1.0) s++;
  if (d.returnOnEquity != null && d.returnOnEquity > 0.20) s++;
  if ((d.operatingMargin ?? 0) > 15) s++;
  if (d.profitMargin != null && d.profitMargin > 0.10) s++;
  if (d.freeCashFlowPerShare != null && d.freeCashFlowPerShare > 0) s++;
  if (d.forwardEPS > d.ttmEPS) s++;
  return { name: "Soros", verdict: verdict(s), score: s };
}

function dalio(d: TickerData): GuruScore {
  // All-Weather / balanced risk
  let s = 0;
  if (d.beta != null && d.beta < 1.5) s++;
  if (d.beta != null && d.beta < 1.0) s++;
  if (d.debtToEquity != null && d.debtToEquity < 0.8) s++;
  if (d.currentRatio != null && d.currentRatio > 1.5) s++;
  if (d.dividendYield > 0.5) s++;
  if (d.grossMargin != null && d.grossMargin > 0.30) s++;
  if (d.piotroski != null && d.piotroski >= 6) s++;
  if (d.returnOnAssets != null && d.returnOnAssets > 0.08) s++;
  if (d.profitMargin != null && d.profitMargin > 0.05) s++;
  if (d.freeCashFlowPerShare != null && d.freeCashFlowPerShare > 0) s++;
  return { name: "Dalio", verdict: verdict(s), score: s };
}

function munger(d: TickerData): GuruScore {
  // Quality at a fair price
  const { revenueGrowth } = g(d);
  let s = 0;
  if (d.grossMargin != null && d.grossMargin > 0.40) s++;
  if (d.returnOnEquity != null && d.returnOnEquity > 0.20) s++;
  if (d.returnOnAssets != null && d.returnOnAssets > 0.12) s++;
  if ((d.operatingMargin ?? 0) > 20) s++;
  if (d.debtToEquity != null && d.debtToEquity < 0.8) s++;
  if (d.freeCashFlowPerShare != null && d.freeCashFlowPerShare > 0) s++;
  if (d.piotroski != null && d.piotroski >= 7) s++;
  if (d.peRatio != null && d.peRatio < 35) s++;
  if (revenueGrowth != null && revenueGrowth > 0.08) s++;
  if (d.profitMargin != null && d.profitMargin > 0.15) s++;
  return { name: "Munger", verdict: verdict(s), score: s };
}

export function scoreGurus(d: TickerData): GuruScore[] {
  return [
    buffett(d),
    lynch(d),
    fisher(d),
    greenblatt(d),
    graham(d),
    templeton(d),
    soros(d),
    dalio(d),
    munger(d),
  ];
}
