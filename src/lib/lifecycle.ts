import type { LifecycleStage } from "./types.ts";

/**
 * Multi-factor lifecycle classification based on Damodaran's 6-stage
 * corporate lifecycle framework.
 *
 * Factors:
 *   1. Revenue growth (3-yr CAGR preferred, 1-yr fallback)
 *   2. Profitability (net income)
 *   3. Operating margin level
 *   4. Capital return policy (dividend yield as a maturity signal)
 *
 * Key differences from a revenue-growth-only classifier:
 *   - Unprofitable ≠ "startup".  A fast-growing, cash-burning company is
 *     "young_growth" (e.g. Uber 2014).  A shrinking, unprofitable company
 *     is "decline".  A dividend-paying company that temporarily dips into
 *     losses stays in its mature bucket.
 *   - 3-yr revenue CAGR smooths single-year noise (cyclical dips, one-off
 *     windfalls, M&A spikes).
 *   - Operating margin separates high-growth companies with established
 *     profitability (high_growth) from those still scaling with thin
 *     margins (young_growth).
 *   - Dividend yield acts as a maturity signal — companies returning cash
 *     to shareholders are never true startups.
 *
 * Reference: Damodaran, "The Corporate Life Cycle: Growing Up Is Hard to Do!"
 *   — 6 stages: Start-Up, Young Growth, High Growth, Mature Growth,
 *     Mature Stable, Decline.
 */

export interface LifecycleSignals {
  /** Revenue values, newest first: [Y0, Y1, Y2, ...] */
  revenueHistory: number[];
  /** Most recent net income */
  netIncome: number;
  /** Most recent operating income (for margin calculation) */
  operatingIncome: number;
  /** Forward dividend yield in % (optional — unavailable in some contexts) */
  dividendYield?: number;
}

/**
 * Compute the revenue growth rate used for lifecycle classification.
 * Prefers a 3-year CAGR over single-year YoY to reduce noise.
 */
export function lifecycleRevGrowth(revenueHistory: number[]): number | null {
  if (revenueHistory.length < 2) return null;
  const rev0 = revenueHistory[0] || 0;

  // 3-yr CAGR if enough data (4 data points = 3 compounding periods)
  if (revenueHistory.length >= 4) {
    const rev3 = revenueHistory[3];
    if (rev3 != null && rev3 > 0 && rev0 > 0) {
      return (Math.pow(rev0 / rev3, 1 / 3) - 1) * 100;
    }
  }

  // Fallback: 1-yr YoY
  const rev1 = revenueHistory[1] || 0;
  if (rev1 > 0) return ((rev0 - rev1) / rev1) * 100;
  return null;
}

export function classifyLifecycle(s: LifecycleSignals): LifecycleStage | null {
  const revGrowth = lifecycleRevGrowth(s.revenueHistory);
  if (revGrowth === null) return null;

  const isProfit    = s.netIncome > 0;
  const rev0        = s.revenueHistory[0] || 0;
  const opMargin    = rev0 > 0 ? (s.operatingIncome / rev0) * 100 : 0;
  const divYield    = s.dividendYield ?? 0;
  const hasMaturity = divYield > 0.5;   // non-trivial dividend ≈ mature company

  // ── UNPROFITABLE COMPANIES ──────────────────────────────────────────────
  // Damodaran: startups are pre-revenue / pre-business-model.
  // Young-growth companies have revenue but burn cash to capture market.
  // Declining unprofitable companies are in "decline", not "startup".
  if (!isProfit) {
    // Scaling rapidly while burning cash (e.g. Uber, early Snap)
    if (revGrowth > 20) return "young_growth";

    // Revenue shrinking AND unprofitable → decline
    if (revGrowth < -5) return "decline";

    // Mature company in a temporary downturn (pays dividends = never a startup)
    if (hasMaturity) {
      return revGrowth < 0 ? "decline" : "mature_stable";
    }

    // Low/moderate growth, no maturity signals, unprofitable = startup
    return "startup";
  }

  // ── PROFITABLE COMPANIES ────────────────────────────────────────────────

  // Revenue declining significantly → decline
  if (revGrowth < -5) return "decline";

  // Mild revenue decline — mature companies can have a flat/down year
  if (revGrowth < 0) {
    // High margins + dividends = mature company, not declining
    if (opMargin > 15 && hasMaturity) return "mature_stable";
    return "decline";
  }

  // Very high growth — distinguish young_growth from high_growth by margins
  // Damodaran: young-growth companies are still scaling with thin margins;
  // high-growth companies have established operating profitability.
  if (revGrowth > 25) {
    if (opMargin < 10 && !hasMaturity) return "young_growth";
    return "high_growth";
  }

  if (revGrowth > 15) return "high_growth";
  if (revGrowth > 5)  return "mature_growth";

  return "mature_stable";
}

/**
 * Map lifecycle signals to an x-position on the S-curve visualization.
 * Position is proportional within the stage zone (each zone ≈ 1/6 of width).
 */
export function lifecycleDotX(s: LifecycleSignals): number | null {
  const revGrowth = lifecycleRevGrowth(s.revenueHistory);
  if (revGrowth === null) return null;

  const stage = classifyLifecycle(s);
  if (!stage) return null;

  // Unprofitable positions
  if (s.netIncome <= 0) {
    if (stage === "startup")      return 0.08;   // Start-Up center
    if (stage === "young_growth") return 0.24;   // Young Growth center
    if (stage === "decline")      return 0.91;   // Decline
    if (stage === "mature_stable") return 0.75;  // Mature stable (downturn)
  }

  // Profitable — map proportionally within zones by growth rate
  if (revGrowth > 60)       return 0.20;   // Young Growth — high end
  if (revGrowth > 40)       return 0.24;   // Young Growth — mid
  if (revGrowth > 30)       return 0.28;   // Young Growth — low end
  if (revGrowth > 22)       return 0.36;   // High Growth — high end
  if (revGrowth > 15)       return 0.42;   // High Growth — low end
  if (revGrowth > 10)       return 0.52;   // Mature Growth — high end
  if (revGrowth > 5)        return 0.58;   // Mature Growth — low end
  if (revGrowth >= 0)       return 0.75;   // Mature Stable
  if (revGrowth > -10)      return 0.87;   // Decline — mild
  if (revGrowth > -20)      return 0.91;   // Decline — moderate
  return 0.95;                             // Decline — severe
}
