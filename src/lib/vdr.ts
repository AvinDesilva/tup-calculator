import type { LifecycleStage } from "./types.ts";

/**
 * Variable Decay Rate (VDR) module.
 *
 * Multi-factor lifecycle fade that determines how aggressively a company's
 * growth rate decays toward a terminal rate over time.
 *
 * Factors:
 *   1. Lifecycle stage → hold period (full-rate years before decay begins)
 *   2. Initial growth magnitude → base VDR tier
 *   3. Operating margin → margin modifier (wide moat = slower decay)
 *   4. Profitability → unprofitable companies' speculative growth fades faster
 *   5. Dividend yield → dynamic floor (dividend payers' total return fades less)
 */

export interface VDRContext {
  stage: LifecycleStage | null;
  operatingMargin: number | null;   // percentage, e.g. 30.4 for 30.4%
  dividendYield: number;            // percentage, e.g. 2.5 for 2.5%
  ttmEPS: number;
}

export const HOLD_PERIOD: Record<LifecycleStage, number> = {
  startup: 7, young_growth: 5, high_growth: 3, mature_growth: 5, mature_stable: 3, decline: 3,
};

const MIN_VDR = 0.02;        // minimum 2pp/yr decay (as decimal)
const BASE_FADE_FLOOR = 0.05; // 5% growth floor (as decimal)

function vdrFactor(initial: number): number {
  if (initial >= 0.40) return 0.20;   // hyper-growth: 20%
  if (initial >= 0.20) return 0.15;   // high-growth:  15%
  return 0.10;                        // moderate:     10%
}

/**
 * Margin modifier: wide-moat companies with high margins decay slower.
 *   opMargin >= 20% → 0.8x (slower decay)
 *   10-20%          → 1.0x (neutral)
 *   5-10%           → 1.1x (slightly faster)
 *   < 5%            → 1.2x (faster decay)
 */
function marginModifier(opMargin: number | null): number {
  if (opMargin == null) return 1.0;
  if (opMargin >= 20) return 0.8;
  if (opMargin >= 10) return 1.0;
  if (opMargin >= 5)  return 1.1;
  return 1.2;
}

/**
 * Profitability modifier: unprofitable = speculative growth fades faster.
 *   ttmEPS <= 0 → 1.25x
 *   ttmEPS > 0  → 1.0x (neutral)
 */
function profitabilityModifier(ttmEPS: number): number {
  return ttmEPS <= 0 ? 1.25 : 1.0;
}

/**
 * Dynamic floor: base 5% + half the dividend yield, capped at 8%.
 * Dividend payers' total return fades less aggressively.
 */
function dynamicFloor(dividendYield: number): number {
  const bonus = (dividendYield / 100) / 2;  // half the yield as decimal
  return Math.min(BASE_FADE_FLOOR + bonus, 0.08);
}

/**
 * Enhanced faded growth with multi-factor VDR context.
 *
 * Hold periods by stage:
 *   Start-Up: 7yr, Young Growth: 5yr, High Growth: 3yr,
 *   Mature Growth: 5yr, Mature Stable: 3yr, Decline: 3yr
 *
 * After the hold period, growth decays annually:
 *   VDR = max(2%, G_initial * VDR_FACTOR * marginMod * profitMod)
 *   G(n) = max(G_initial - (n - HoldPeriod) * VDR, dynamicFloor)
 */
export function fadedGrowth(initial: number, year: number, ctx: VDRContext): number {
  const floor = dynamicFloor(ctx.dividendYield);
  if (initial <= floor) return initial;            // already at or below floor
  const hold = ctx.stage ? HOLD_PERIOD[ctx.stage] : 0;
  if (year <= hold) return initial;                // hold period — full rate

  const mMod = marginModifier(ctx.operatingMargin);
  const pMod = profitabilityModifier(ctx.ttmEPS);
  const vdr  = Math.max(MIN_VDR, initial * vdrFactor(initial) * mMod * pMod);
  const decay = (year - hold) * vdr;
  return Math.max(initial - decay, floor);
}
