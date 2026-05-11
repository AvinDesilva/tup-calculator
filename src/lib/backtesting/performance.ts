import type { HistoricalPricePoint } from "../types.ts";

/**
 * Find the price closest to a target date in a sorted (oldest→newest) price array.
 * Returns null if no data is within maxWeeks weeks.
 */
export function findPriceNear(
  prices: HistoricalPricePoint[],
  targetDate: string,
  maxWeeks = 8,
): number | null {
  if (!prices.length) return null;
  const target = new Date(targetDate).getTime();
  const maxMs   = maxWeeks * 7 * 24 * 3600 * 1000;
  let best: HistoricalPricePoint | null = null;
  let bestDiff = Infinity;
  for (const p of prices) {
    const diff = Math.abs(new Date(p.date).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best && bestDiff <= maxMs ? best.close : null;
}

/**
 * Add `years` years to a date string.
 */
function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculate percentage return from startPrice to the price `years` years later.
 * Returns null if the forward date is not available in the price array.
 */
export function calcForwardReturn(
  prices: HistoricalPricePoint[],
  startDate: string,
  startPrice: number,
  years: number,
): number | null {
  const targetDate  = addYears(startDate, years);
  const futurePrice = findPriceNear(prices, targetDate, 8);
  if (!futurePrice) return null;
  return ((futurePrice - startPrice) / startPrice) * 100;
}

/**
 * Alpha = stock return - benchmark return (both in %). Null if either is null.
 */
export function calcAlpha(
  stockReturn: number | null,
  benchReturn: number | null,
): number | null {
  if (stockReturn == null || benchReturn == null) return null;
  return stockReturn - benchReturn;
}

/**
 * Max drawdown (most negative peak-to-trough) in the `windowYears` forward window.
 * Returns a negative percentage (e.g. -35.2) or null if insufficient data.
 */
export function calcMaxDrawdown(
  prices: HistoricalPricePoint[],
  startDate: string,
  windowYears: number,
): number | null {
  const start = new Date(startDate).getTime();
  const end   = new Date(addYears(startDate, windowYears)).getTime();
  const window = prices.filter(p => {
    const t = new Date(p.date).getTime();
    return t >= start && t <= end;
  });
  if (window.length < 4) return null;
  let peak = window[0].close;
  let maxDD = 0;
  for (const p of window) {
    if (p.close > peak) peak = p.close;
    const dd = (p.close - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

/**
 * Earnings accuracy: how close was the predicted 3yr CAGR to the actual EPS CAGR.
 * Score 0–1, where 1 = perfect.
 */
export function calcEarningsAccuracy(
  predictedGrowthPct: number,
  epsAtSnapshot: number,
  epsThreeYearsLater: number | null,
): number | null {
  if (epsThreeYearsLater == null || epsAtSnapshot <= 0) return null;
  const actualCAGR = (Math.pow(epsThreeYearsLater / epsAtSnapshot, 1 / 3) - 1) * 100;
  const predicted  = predictedGrowthPct;
  const ref = Math.max(Math.abs(actualCAGR), Math.abs(predicted), 1);
  return Math.max(0, 1 - Math.abs(actualCAGR - predicted) / ref);
}
