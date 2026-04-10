import { describe, it, expect } from "vitest";
import { calcTUP } from "./calcTUP.ts";
import type { InputState } from "../types.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE_INP: InputState = {
  marketCap: 1_000_000_000,
  debt: 100_000_000,
  cash: 50_000_000,
  shares: 100_000_000, // adjPrice = (1B + 100M - 50M) / 100M = $10.50
  ttmEPS: 1.0,
  forwardEPS: 1.1,
  historicalGrowth: 15,
  analystGrowth: 12,
  fwdGrowthY1: 12,
  fwdGrowthY2: 10,
  fwdCAGR: 11,
  revenuePerShare: 5.0,
  targetMargin: 15,
  inceptionGrowth: 20,
  breakEvenYear: 1,
  currentPrice: 10.5,
  sma200: 9.0,
  dividendYield: 0,
  operatingMargin: 20,
  lifecycleStage: null,
  growthOverrides: {},
  decayMode: "none",
};

function makeInp(overrides: Partial<InputState>): InputState {
  return { ...BASE_INP, ...overrides };
}

const P = 5; // decimal digits for toBeCloseTo

// ── Terminal Growth Rate Formula ─────────────────────────────────────────────

describe("terminal growth rate formula", () => {
  it("1: mature growth (AAPL-like)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: 10, fwdGrowthY1: 8, fwdGrowthY2: 6, dividendYield: 0.5 }),
      "standard",
    )!;
    // histBlended = (0.10 + 0.08) / 2 = 0.09
    // fwdCompound = sqrt(1.08 * 1.06) - 1 = 0.06995
    // terminal = (0.09 + 0.06995) / 2 + 0.005 = 0.08498
    expect(r.grY1).toBeCloseTo(0.08 + 0.005, P);
    expect(r.grY2).toBeCloseTo(0.06 + 0.005, P);
    expect(r.grTerminal).toBeCloseTo(0.08498, 4);
  });

  it("2: hyper growth (APP-like)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: 96, fwdGrowthY1: 28, fwdGrowthY2: 22, dividendYield: 0 }),
      "standard",
    )!;
    // histBlended = (0.96 + 0.28) / 2 = 0.62
    // fwdCompound = sqrt(1.28 * 1.22) - 1 = 0.24965
    // terminal = (0.62 + 0.24965) / 2 = 0.43483
    expect(r.grY1).toBeCloseTo(0.28, P);
    expect(r.grY2).toBeCloseTo(0.22, P);
    expect(r.grTerminal).toBeCloseTo(0.43483, 4);
  });

  it("3: dividend payer (NVO-like)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: 20, fwdGrowthY1: 15, fwdGrowthY2: 12, dividendYield: 4.9 }),
      "standard",
    )!;
    // histBlended = (0.20 + 0.15) / 2 = 0.175
    // fwdCompound = sqrt(1.15 * 1.12) - 1 = 0.13490
    // terminal = (0.175 + 0.13490) / 2 + 0.049 = 0.20395
    expect(r.grY1).toBeCloseTo(0.15 + 0.049, P);
    expect(r.grY2).toBeCloseTo(0.12 + 0.049, P);
    expect(r.grTerminal).toBeCloseTo(0.20395, 4);
  });

  it("4: cyclical recovery (negative hist, positive fwd)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: -5, fwdGrowthY1: 25, fwdGrowthY2: 15, dividendYield: 0 }),
      "standard",
    )!;
    // histBlended = (-0.05 + 0.25) / 2 = 0.10
    // fwdCompound = sqrt(1.25 * 1.15) - 1 = 0.19896
    // terminal = (0.10 + 0.19896) / 2 = 0.14948
    expect(r.grY1).toBeCloseTo(0.25, P);
    expect(r.grY2).toBeCloseTo(0.15, P);
    expect(r.grTerminal).toBeCloseTo(0.14948, 4);
  });

  it("5: declining company (all negative rates, dividend offset)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: -10, fwdGrowthY1: -5, fwdGrowthY2: -8, dividendYield: 3 }),
      "standard",
    )!;
    // histBlended = (-0.10 + -0.05) / 2 = -0.075
    // fwdProduct = 0.95 * 0.92 = 0.874 > 0
    // fwdCompound = sqrt(0.874) - 1 = -0.06513
    // terminal = (-0.075 + -0.06513) / 2 + 0.03 = -0.04006
    expect(r.grY1).toBeCloseTo(-0.05 + 0.03, P);
    expect(r.grY2).toBeCloseTo(-0.08 + 0.03, P);
    expect(r.grTerminal).toBeCloseTo(-0.04006, 4);
  });

  it("6: turnaround (deep negative hist, strong positive fwd)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: -20, fwdGrowthY1: 30, fwdGrowthY2: 20, dividendYield: 0 }),
      "standard",
    )!;
    // histBlended = (-0.20 + 0.30) / 2 = 0.05
    // fwdCompound = sqrt(1.30 * 1.20) - 1 = 0.24900
    // terminal = (0.05 + 0.24900) / 2 = 0.14950
    expect(r.grY1).toBeCloseTo(0.30, P);
    expect(r.grY2).toBeCloseTo(0.20, P);
    expect(r.grTerminal).toBeCloseTo(0.14950, 4);
  });

  it("7: severe contraction (near-extreme negatives, product > 0)", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: 10, fwdGrowthY1: -80, fwdGrowthY2: -50, dividendYield: 0 }),
      "standard",
    )!;
    // histBlended = (0.10 + -0.80) / 2 = -0.35
    // fwdProduct = 0.20 * 0.50 = 0.10 > 0
    // fwdCompound = sqrt(0.10) - 1 = -0.68377
    // terminal = (-0.35 + -0.68377) / 2 = -0.51689
    expect(r.grTerminal).toBeCloseTo(-0.51689, 4);
  });

  it("8: extreme negative — fwdProduct < 0 triggers arithmetic mean fallback", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: 10, fwdGrowthY1: 50, fwdGrowthY2: -200, dividendYield: 0 }),
      "standard",
    )!;
    // fwdProduct = 1.50 * (-1.00) = -1.50 < 0 → fallback
    // fwdCompound = (0.50 + -2.00) / 2 = -0.75
    // histBlended = (0.10 + 0.50) / 2 = 0.30
    // terminal = (0.30 + -0.75) / 2 = -0.225
    expect(r.grY1).toBeCloseTo(0.50, P);
    expect(r.grY2).toBeCloseTo(-2.00, P);
    expect(r.grTerminal).toBeCloseTo(-0.225, P);
  });

  it("9: Y2 null — geometric mean degrades to Y1", () => {
    const r = calcTUP(
      makeInp({ historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: null, dividendYield: 0 }),
      "standard",
    )!;
    // fwd2Rate = fwd1Rate = 0.12
    // histBlended = (0.15 + 0.12) / 2 = 0.135
    // fwdCompound = sqrt(1.12 * 1.12) - 1 = 0.12
    // terminal = (0.135 + 0.12) / 2 = 0.1275
    expect(r.grY1).toBeCloseTo(0.12, P);
    expect(r.grY2).toBeCloseTo(0.12, P);
    expect(r.grTerminal).toBeCloseTo(0.1275, P);
  });

  it("10: negative epsBase — all forward rates collapse to histRate", () => {
    const r = calcTUP(
      makeInp({
        ttmEPS: -2, forwardEPS: 1, // epsBase = (-2+1)/2 = -0.5
        historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: 10, dividendYield: 0,
      }),
      "standard",
    )!;
    // epsBase <= 0 → fwd1Rate = fwd2Rate = histRate = 0.15
    // histBlended = (0.15 + 0.15) / 2 = 0.15
    // fwdCompound = sqrt(1.15 * 1.15) - 1 = 0.15
    // terminal = (0.15 + 0.15) / 2 = 0.15
    expect(r.epsBase).toBeCloseTo(-0.5, P);
    expect(r.grY1).toBeCloseTo(0.15, P);
    expect(r.grY2).toBeCloseTo(0.15, P);
    expect(r.grTerminal).toBeCloseTo(0.15, P);
  });
});

// ── Guard Rails ──────────────────────────────────────────────────────────────

describe("guard rails", () => {
  it("returns null when shares = 0", () => {
    expect(calcTUP(makeInp({ shares: 0 }), "standard")).toBeNull();
  });

  it("returns null when shares < 0", () => {
    expect(calcTUP(makeInp({ shares: -100 }), "standard")).toBeNull();
  });

  it("no NaN or Infinity in any company profile", () => {
    const profiles: Partial<InputState>[] = [
      { historicalGrowth: 10, fwdGrowthY1: 8, fwdGrowthY2: 6, dividendYield: 0.5 },
      { historicalGrowth: 96, fwdGrowthY1: 28, fwdGrowthY2: 22 },
      { historicalGrowth: 20, fwdGrowthY1: 15, fwdGrowthY2: 12, dividendYield: 4.9 },
      { historicalGrowth: -5, fwdGrowthY1: 25, fwdGrowthY2: 15 },
      { historicalGrowth: -10, fwdGrowthY1: -5, fwdGrowthY2: -8, dividendYield: 3 },
      { historicalGrowth: -20, fwdGrowthY1: 30, fwdGrowthY2: 20 },
      { historicalGrowth: 10, fwdGrowthY1: -80, fwdGrowthY2: -50 },
      { historicalGrowth: 10, fwdGrowthY1: 50, fwdGrowthY2: -200 },
      { historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: null },
      { ttmEPS: -2, forwardEPS: 1, historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: 10 },
    ];
    for (const p of profiles) {
      const r = calcTUP(makeInp(p), "standard")!;
      expect(r).not.toBeNull();
      expect(Number.isNaN(r.grTerminal)).toBe(false);
      expect(Number.isFinite(r.grTerminal)).toBe(true);
    }
  });
});

// ── Verdict Integration ──────────────────────────────────────────────────────

describe("verdict integration", () => {
  // Use high growth + low adjPrice to hit strong_buy (payback ≤ 7)
  it("strong_buy when payback ≤ threshold * 0.7", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 200_000_000, debt: 0, cash: 0, shares: 100_000_000, // adjPrice = $2
        ttmEPS: 0.50, forwardEPS: 0.60,
        historicalGrowth: 30, fwdGrowthY1: 25, fwdGrowthY2: 20,
      }),
      "standard",
    )!;
    expect(r.verdict).toBe("strong_buy");
    expect(r.payback).not.toBeNull();
    expect(r.payback!).toBeLessThanOrEqual(7);
  });

  // Moderate growth + moderate adjPrice → buy (payback 8–9)
  it("buy when payback ≤ threshold * 0.9", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 1_000_000_000, debt: 0, cash: 0, shares: 100_000_000, // adjPrice = $10
        ttmEPS: 0.80, forwardEPS: 0.90,
        historicalGrowth: 12, fwdGrowthY1: 10, fwdGrowthY2: 8,
      }),
      "standard",
    )!;
    expect(r.payback).not.toBeNull();
    expect(r.payback!).toBeGreaterThan(7);
    expect(r.payback!).toBeLessThanOrEqual(9);
    expect(r.verdict).toBe("buy");
  });

  // Lower growth + higher adjPrice → hold (payback 10–12)
  it("hold when payback ≤ threshold * 1.2", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 1_200_000_000, debt: 0, cash: 0, shares: 100_000_000, // adjPrice = $12
        ttmEPS: 0.70, forwardEPS: 0.75,
        historicalGrowth: 10, fwdGrowthY1: 8, fwdGrowthY2: 6,
      }),
      "standard",
    )!;
    expect(r.payback).not.toBeNull();
    expect(r.payback!).toBeGreaterThan(9);
    expect(r.payback!).toBeLessThanOrEqual(12);
    expect(r.verdict).toBe("hold");
  });

  // Stretched zone → payback 13–15
  it("stretched when payback ≤ threshold * 1.5", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 2_000_000_000, debt: 0, cash: 0, shares: 100_000_000, // adjPrice = $20
        ttmEPS: 0.80, forwardEPS: 0.85,
        historicalGrowth: 8, fwdGrowthY1: 7, fwdGrowthY2: 6,
      }),
      "standard",
    )!;
    expect(r.payback).not.toBeNull();
    expect(r.payback!).toBeGreaterThan(12);
    expect(r.payback!).toBeLessThanOrEqual(15);
    expect(r.verdict).toBe("stretched");
  });

  // Very low growth + high adjPrice → avoid
  it("avoid when payback exceeds threshold * 1.5", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 5_000_000_000, debt: 0, cash: 0, shares: 100_000_000, // adjPrice = $50
        ttmEPS: 0.50, forwardEPS: 0.55,
        historicalGrowth: 3, fwdGrowthY1: 2, fwdGrowthY2: 1,
      }),
      "standard",
    )!;
    expect(r.verdict).toBe("avoid");
  });

  // Falling knife + buy zone → spec_buy
  it("spec_buy when falling knife and buy-zone payback", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 200_000_000, debt: 0, cash: 0, shares: 100_000_000,
        ttmEPS: 0.50, forwardEPS: 0.60,
        historicalGrowth: 30, fwdGrowthY1: 25, fwdGrowthY2: 20,
        currentPrice: 1.80, sma200: 2.50, // price < SMA → falling knife
      }),
      "standard",
    )!;
    expect(r.fallingKnife).toBe(true);
    expect(r.verdict).toBe("spec_buy");
  });

  // Falling knife + hold zone → avoid
  it("avoid when falling knife and hold-zone payback", () => {
    const r = calcTUP(
      makeInp({
        marketCap: 1_200_000_000, debt: 0, cash: 0, shares: 100_000_000,
        ttmEPS: 0.70, forwardEPS: 0.75,
        historicalGrowth: 10, fwdGrowthY1: 8, fwdGrowthY2: 6,
        currentPrice: 10.0, sma200: 13.0, // price < SMA → falling knife
      }),
      "standard",
    )!;
    expect(r.fallingKnife).toBe(true);
    expect(r.verdict).toBe("avoid");
  });
});

// ── Payback Year Sanity ──────────────────────────────────────────────────────

describe("payback year sanity", () => {
  it("positive terminal rate profiles have non-null payback within SAFETY_CAP", () => {
    const positiveProfiles: Partial<InputState>[] = [
      { historicalGrowth: 10, fwdGrowthY1: 8, fwdGrowthY2: 6, dividendYield: 0.5 },
      { historicalGrowth: 96, fwdGrowthY1: 28, fwdGrowthY2: 22 },
      { historicalGrowth: 20, fwdGrowthY1: 15, fwdGrowthY2: 12, dividendYield: 4.9 },
      { historicalGrowth: -5, fwdGrowthY1: 25, fwdGrowthY2: 15 },
      { historicalGrowth: -20, fwdGrowthY1: 30, fwdGrowthY2: 20 },
    ];
    for (const p of positiveProfiles) {
      const r = calcTUP(makeInp(p), "standard")!;
      expect(r.payback).not.toBeNull();
      expect(r.payback!).toBeGreaterThan(0);
      expect(r.payback!).toBeLessThanOrEqual(30);
    }
  });

  it("negative terminal rate profiles have null payback", () => {
    const negativeProfiles: Partial<InputState>[] = [
      { historicalGrowth: 10, fwdGrowthY1: -80, fwdGrowthY2: -50 },
      { historicalGrowth: 10, fwdGrowthY1: 50, fwdGrowthY2: -200 },
      { ttmEPS: -2, forwardEPS: 1, historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: 10 },
    ];
    for (const p of negativeProfiles) {
      const r = calcTUP(makeInp(p), "standard")!;
      expect(r.payback).toBeNull();
    }
  });
});

// ── Fixed Friction Decay ────────────────────────────────────────────────────

describe("fixed friction decay", () => {
  it("decays 5pp/yr after hold period", () => {
    const r = calcTUP(
      makeInp({
        lifecycleStage: "high_growth", // hold = 3
        decayMode: "ff",
        historicalGrowth: 30, fwdGrowthY1: 25, fwdGrowthY2: 20,
        dividendYield: 0,
      }),
      "standard",
    )!;
    // Year 3 is still Y2 rate (explicit forward), year 4+ uses terminal with FF decay
    // FF floor = 0.03 + 0 = 0.03
    const y4gr = r.rows[3].growthRate / 100;
    const y5gr = r.rows[4].growthRate / 100;
    expect(y4gr - y5gr).toBeCloseTo(0.05, 4);
  });

  it("floors at risk-free rate (3%) when no dividends", () => {
    const r = calcTUP(
      makeInp({
        lifecycleStage: null, // hold = 0
        decayMode: "ff",
        historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: 10,
        dividendYield: 0,
      }),
      "standard",
    )!;
    // Terminal rate ~12.75%, floor = 3%, decay = 5pp/yr from year 3+
    // Should eventually hit floor
    const lastRow = r.rows[r.rows.length - 1];
    expect(lastRow.growthRate / 100).toBeGreaterThanOrEqual(0.03 - 0.001);
  });

  it("floors at RF + dividendYield", () => {
    const r = calcTUP(
      makeInp({
        lifecycleStage: null, // hold = 0
        decayMode: "ff",
        historicalGrowth: 15, fwdGrowthY1: 12, fwdGrowthY2: 10,
        dividendYield: 4, // floor = 3% + 4% = 7%
      }),
      "standard",
    )!;
    // With 4% dividend yield, floor = 0.07
    const lastRow = r.rows[r.rows.length - 1];
    expect(lastRow.growthRate / 100).toBeGreaterThanOrEqual(0.07 - 0.001);
  });

  it("respects hold period — no decay during hold years", () => {
    const r = calcTUP(
      makeInp({
        lifecycleStage: "startup", // hold = 7
        decayMode: "ff",
        historicalGrowth: 30, fwdGrowthY1: 28, fwdGrowthY2: 25,
        dividendYield: 0,
      }),
      "standard",
    )!;
    // Years 3-7 should all have the same terminal growth rate (hold period)
    const y3gr = r.rows[2].growthRate;
    const y7gr = r.rows[6].growthRate;
    expect(y3gr).toBeCloseTo(y7gr, 4);
  });

  it("returns initial when already below floor", () => {
    const r = calcTUP(
      makeInp({
        lifecycleStage: null,
        decayMode: "ff",
        historicalGrowth: 2, fwdGrowthY1: 2, fwdGrowthY2: 2,
        dividendYield: 0, // floor = 3%, terminal ~2% which is below floor
      }),
      "standard",
    )!;
    // Terminal rate ~2%, below 3% floor → should stay at terminal rate (no upward adjustment)
    const y3gr = r.rows[2].growthRate / 100;
    expect(y3gr).toBeLessThan(0.03);
  });

  it("produces different payback than none mode", () => {
    const base = {
      marketCap: 2_000_000_000, debt: 0, cash: 0, shares: 100_000_000, // adjPrice = $20
      ttmEPS: 0.80, forwardEPS: 0.85,
      lifecycleStage: "high_growth" as const, // hold = 3
      historicalGrowth: 12, fwdGrowthY1: 10, fwdGrowthY2: 8,
      dividendYield: 0,
    };
    const rFF = calcTUP(makeInp({ ...base, decayMode: "ff" }), "standard")!;
    const rNone = calcTUP(makeInp({ ...base, decayMode: "none" }), "standard")!;
    // FF decay kicks in after hold period, so payback should be longer
    expect(rFF.payback).toBeGreaterThan(rNone.payback!);
  });
});
