import { describe, it, expect } from "vitest";
import { calcTUP } from "./calcTUP.ts";
import type { InputState } from "../types.ts";

// One-off before/after demonstration of the WSM dividend-yield fix impact.
// Representative WSM FY2024 fundamentals; the point is the delta, not precision.
const WSM: InputState = {
  marketCap: 28.0e9, debt: 1.25e9, cash: 1.25e9, shares: 123e6,
  ttmEPS: 8.50, forwardEPS: 8.90,
  historicalGrowth: 15, analystGrowth: 8, fwdGrowthY1: 5, fwdGrowthY2: 8, fwdCAGR: 6.5,
  revenuePerShare: 62, targetMargin: 18,
  inceptionGrowth: 12, breakEvenYear: 0,
  currentPrice: 227.53, sma200: 205,
  dividendYield: 0,
  operatingMargin: 17, lifecycleStage: "mature_stable", growthOverrides: {}, decayMode: "ff",
};

describe("WSM dividend fix — before/after", () => {
  it("adding the recovered 1.34% yield raises the blended rate and improves payback", () => {
    const before = calcTUP({ ...WSM, dividendYield: 0 }, "standard")!;
    const after  = calcTUP({ ...WSM, dividendYield: 1.34 }, "standard")!;

    const cum30 = (r: typeof before) => r.rows[r.rows.length - 1].cum;
    const pb    = (r: typeof before) => (r.payback ?? Infinity);
    const fmtPb = (r: typeof before) => (r.payback == null ? ">30y (beyond cap)" : `${r.payback}y`);

    console.log(
      `\nWSM before/after dividend fix (adjPrice $${before.adjPrice.toFixed(2)}):\n` +
      `  Blended rate (grTerminal): ${(before.gr * 100).toFixed(2)}%  →  ${(after.gr * 100).toFixed(2)}%\n` +
      `  Payback:                   ${fmtPb(before)}  →  ${fmtPb(after)}\n` +
      `  Cum. EPS recovered @30y:   $${cum30(before).toFixed(0)}  →  $${cum30(after).toFixed(0)}\n` +
      `  Verdict:                   ${before.verdict}  →  ${after.verdict}\n`,
    );

    // Exact downstream effect: dividend adds 1.34pp to the blended/final rate.
    expect(after.gr).toBeCloseTo(before.gr + 0.0134, 6);
    // Higher rate ⇒ payback no later, and strictly more principal recovered.
    expect(pb(after)).toBeLessThanOrEqual(pb(before));
    expect(cum30(after)).toBeGreaterThan(cum30(before));
  });
});
