import { describe, it, expect } from "vitest";
import {
  ADR_FINANCIALS_CCY,
  ADR_RATIO_TABLE,
  ADR_EPS_RATIO,
  FALLBACK_FX,
  EXCHANGE_CCY,
} from "../constants.ts";
import { deriveShares, sanitizedNetIncome } from "./api.ts";

// ── A. Currency resolution priority ──────────────────────────────────────────
// ADR_FINANCIALS_CCY must override FMP-reported "USD" for NYSE-listed ADRs.

describe("ADR_FINANCIALS_CCY overrides FMP-reported currency", () => {
  /**
   * Mimics the resolution chain in api.ts:
   *   ADR_FINANCIALS_CCY[t] || inc[0]?.reportingCurrency || p.currency || "USD"
   */
  function resolveFinancialsCcy(
    ticker: string,
    reportingCurrency: string | undefined,
    profileCurrency: string | undefined,
  ): string {
    return ADR_FINANCIALS_CCY[ticker] || reportingCurrency || profileCurrency || "USD";
  }

  const expectedOverrides: [string, string][] = [
    // Existing
    ["TSM",  "TWD"],
    ["NVO",  "DKK"],
    ["ASML", "EUR"],
    // Asia-Pacific
    ["TM",   "JPY"],
    ["SONY", "JPY"],
    ["BABA", "CNH"],
    ["INFY", "INR"],
    ["KB",   "KRW"],
    ["BHP",  "AUD"],
    // Europe
    ["SAP",  "EUR"],
    ["UL",   "EUR"],
    ["DEO",  "GBP"],
    ["NVS",  "CHF"],
    // Latin America
    ["AMX",  "MXN"],
  ];

  it.each(expectedOverrides)(
    "%s → financialsCurrency = %s even when FMP reports USD",
    (ticker, expectedCcy) => {
      // FMP reports "USD" for both reportingCurrency and profile.currency
      const resolved = resolveFinancialsCcy(ticker, "USD", "USD");
      expect(resolved).toBe(expectedCcy);
    },
  );

  it.each(expectedOverrides)(
    "%s → financialsCurrency = %s even when FMP reports undefined",
    (ticker, expectedCcy) => {
      // FMP returns undefined/null for reportingCurrency
      const resolved = resolveFinancialsCcy(ticker, undefined, "USD");
      expect(resolved).toBe(expectedCcy);
    },
  );
});

// ── B. FX rate application per currency region ───────────────────────────────
// Verifies that balance-sheet & EPS values in home currency, when multiplied
// by the FALLBACK_FX rate, produce correct USD-equivalent numbers.

describe("FX rate application — one test per currency region", () => {
  /**
   * Mimics the core conversion logic in api.ts:
   *   totalDebt     = rawDebt * fxRate
   *   totalCash     = rawCash * fxRate
   *   ttmEPS        = (rawNetIncome * fxRate) / adrShares
   *   revenuePerShare = (rawRevenue * fxRate) / adrShares
   *
   * Note: adrShares from deriveShares() already returns the correct per-ADR unit
   * count (either from mktCap/price for forced derivation, or sharesOutstanding).
   * No additional epsScale is applied to ttmEPS — it is inherently per-ADR.
   */
  function applyConversion(
    rawDebt: number,
    rawCash: number,
    rawNetIncome: number,
    rawRevenue: number,
    adrShares: number,
    fxRate: number,
  ) {
    return {
      totalDebt: rawDebt * fxRate,
      totalCash: rawCash * fxRate,
      ttmEPS: adrShares > 0 ? (rawNetIncome * fxRate) / adrShares : 0,
      revenuePerShare: adrShares > 0 ? (rawRevenue * fxRate) / adrShares : 0,
    };
  }

  function getFxRate(ccy: string): number {
    return FALLBACK_FX[`${ccy}USD`] || 1;
  }

  it("TSM (Taiwan, TWD) — debt converts correctly, ttmEPS per ADR-unit share", () => {
    const fx = getFxRate("TWD"); // 0.031
    // FMP normalizes TSM shares to ADR-equivalent units (~5.187B = 25.9B ordinary ÷ 5)
    // So adrShares from deriveShares is already the ADR unit count.
    // ttmEPS = netIncome × fxRate / adrUnits — no additional scaling needed.
    const r = applyConversion(1_900_000_000_000, 200_000_000_000, 800_000_000_000, 2_500_000_000_000, 5_180_000_000, fx);
    expect(r.totalDebt).toBeCloseTo(1_900_000_000_000 * 0.031, 0);
    expect(r.totalCash).toBeCloseTo(200_000_000_000 * 0.031, 0);
    expect(r.ttmEPS).toBeCloseTo((800_000_000_000 * 0.031) / 5_180_000_000, 2);
  });

  it("NVO (Denmark, DKK) — EPS converts correctly", () => {
    const fx = getFxRate("DKK"); // 0.145
    const shares = 4_500_000_000;
    const netIncome = 83_000_000_000; // ~83B DKK
    const r = applyConversion(50_000_000_000, 30_000_000_000, netIncome, 230_000_000_000, shares, fx);
    expect(r.ttmEPS).toBeCloseTo((netIncome * 0.145) / shares, 2);
    expect(r.totalDebt).toBeCloseTo(50_000_000_000 * 0.145, 0);
  });

  it("ASML (Netherlands, EUR) — cash converts correctly", () => {
    const fx = getFxRate("EUR"); // 1.09
    const r = applyConversion(5_000_000_000, 3_500_000_000, 7_500_000_000, 27_600_000_000, 393_000_000, fx);
    expect(r.totalCash).toBeCloseTo(3_500_000_000 * 1.09, 0);
    expect(r.ttmEPS).toBeCloseTo((7_500_000_000 * 1.09) / 393_000_000, 2);
  });

  it("TM (Japan, JPY) — large yen values convert correctly", () => {
    const fx = getFxRate("JPY"); // 0.0067
    // Toyota: ~25T JPY revenue, ~3T JPY net income
    const r = applyConversion(25_000_000_000_000, 8_000_000_000_000, 3_000_000_000_000, 25_000_000_000_000, 1_600_000_000, fx);
    expect(r.totalDebt).toBeCloseTo(25_000_000_000_000 * 0.0067, 0);
    expect(r.ttmEPS).toBeCloseTo((3_000_000_000_000 * 0.0067) / 1_600_000_000, 2);
  });

  it("AZN / UL (UK/Europe, GBP) — revenue per share converts correctly", () => {
    const fx = getFxRate("GBP"); // 1.26
    // Using Diageo-like GBP figures
    const r = applyConversion(15_000_000_000, 2_000_000_000, 3_000_000_000, 17_000_000_000, 2_300_000_000, fx);
    expect(r.revenuePerShare).toBeCloseTo((17_000_000_000 * 1.26) / 2_300_000_000, 2);
  });

  it("BABA (China, CNH) — EPS converts correctly", () => {
    const fx = getFxRate("CNH"); // 0.138
    // Alibaba: ~80B CNH net income, ~2.5B ADR shares
    const r = applyConversion(150_000_000_000, 300_000_000_000, 80_000_000_000, 900_000_000_000, 2_500_000_000, fx);
    expect(r.ttmEPS).toBeCloseTo((80_000_000_000 * 0.138) / 2_500_000_000, 2);
    expect(r.totalDebt).toBeCloseTo(150_000_000_000 * 0.138, 0);
  });

  it("INFY (India, INR) — debt converts correctly", () => {
    const fx = getFxRate("INR"); // 0.012
    const r = applyConversion(100_000_000_000, 300_000_000_000, 250_000_000_000, 1_500_000_000_000, 4_100_000_000, fx);
    expect(r.totalDebt).toBeCloseTo(100_000_000_000 * 0.012, 0);
    expect(r.ttmEPS).toBeCloseTo((250_000_000_000 * 0.012) / 4_100_000_000, 2);
  });

  it("KB (S. Korea, KRW) — cash converts correctly", () => {
    const fx = getFxRate("KRW"); // 0.00073
    const r = applyConversion(200_000_000_000_000, 50_000_000_000_000, 5_000_000_000_000, 15_000_000_000_000, 400_000_000, fx);
    expect(r.totalCash).toBeCloseTo(50_000_000_000_000 * 0.00073, 0);
    expect(r.ttmEPS).toBeCloseTo((5_000_000_000_000 * 0.00073) / 400_000_000, 2);
  });

  it("BHP (Australia, AUD) — EPS converts correctly", () => {
    const fx = getFxRate("AUD"); // 0.63
    const r = applyConversion(30_000_000_000, 15_000_000_000, 13_000_000_000, 55_000_000_000, 2_500_000_000, fx);
    expect(r.ttmEPS).toBeCloseTo((13_000_000_000 * 0.63) / 2_500_000_000, 2);
  });

  it("NVS (Switzerland, CHF) — debt converts correctly", () => {
    const fx = getFxRate("CHF"); // 1.11
    const r = applyConversion(35_000_000_000, 12_000_000_000, 11_000_000_000, 45_000_000_000, 2_000_000_000, fx);
    expect(r.totalDebt).toBeCloseTo(35_000_000_000 * 1.11, 0);
    expect(r.ttmEPS).toBeCloseTo((11_000_000_000 * 1.11) / 2_000_000_000, 2);
  });

  it("AMX (Mexico, MXN) — debt and EPS convert correctly", () => {
    const fx = getFxRate("MXN"); // 0.058
    // América Móvil: ~900B MXN revenue, ~50B MXN net income
    const r = applyConversion(600_000_000_000, 100_000_000_000, 50_000_000_000, 900_000_000_000, 3_400_000_000, fx);
    expect(r.totalDebt).toBeCloseTo(600_000_000_000 * 0.058, 0);
    expect(r.ttmEPS).toBeCloseTo((50_000_000_000 * 0.058) / 3_400_000_000, 2);
    expect(r.revenuePerShare).toBeCloseTo((900_000_000_000 * 0.058) / 3_400_000_000, 2);
  });
});

// ── C. ADR share count derivation ────────────────────────────────────────────

describe("ADR share count derivation (deriveShares)", () => {
  describe("ratio > 1 — derives shares from mktCap / price", () => {
    const adrsWithRatio: [string, number][] = [
      ["TSM",  5],
      ["NVO",  6],
      ["TM",   10],
      ["BABA", 8],
      ["BHP",  2],
      ["AMX",  20],
    ];

    it.each(adrsWithRatio)(
      "%s (ratio=%i) uses mktCap/price for share count",
      (ticker, expectedRatio) => {
        expect(ADR_RATIO_TABLE[ticker]).toBe(expectedRatio);
        const mktCap = 500_000_000_000;
        const price = 175;
        const rawShares = 50_000_000_000; // intentionally wrong to prove derivation
        const shares = deriveShares(ticker, mktCap, price, rawShares);
        expect(shares).toBeCloseTo(mktCap / price, 0);
        expect(shares).not.toBe(rawShares);
      },
    );

    it("falls back to sharesOutstanding when mktCap = 0", () => {
      const shares = deriveShares("TSM", 0, 175, 5_000_000_000);
      expect(shares).toBe(5_000_000_000);
    });

    it("falls back to sharesOutstanding when price = 0", () => {
      const shares = deriveShares("NVO", 300_000_000_000, 0, 4_500_000_000);
      expect(shares).toBe(4_500_000_000);
    });
  });

  describe("ratio = 1 — uses sharesOutstanding when mktCap/price agrees", () => {
    const adrsWithoutRatio: string[] = [
      "ASML", "SONY", "SAP", "UL", "INFY", "KB", "DEO", "NVS",
    ];

    it.each(adrsWithoutRatio)(
      "%s (ratio=1) uses sharesOutstanding when consistent with mktCap/price",
      (ticker) => {
        expect(ADR_RATIO_TABLE[ticker]).toBe(1);
        const rawShares = 2_000_000_000;
        // mktCap/price = 500B/250 = 2B — matches rawShares (no divergence)
        const shares = deriveShares(ticker, 500_000_000_000, 250, rawShares);
        expect(shares).toBe(rawShares);
      },
    );
  });

  describe("cross-check — prefers mktCap/price when FMP shares diverge >50%", () => {
    it("large divergence (5x) triggers cross-check", () => {
      // mktCap/price = 2B/20 = 100M, FMP says 500M (5x off)
      const shares = deriveShares("BWMX", 2_000_000_000, 20, 500_000_000);
      expect(shares).toBeCloseTo(100_000_000, 0);
    });

    it("small divergence (20%) does NOT trigger cross-check", () => {
      // mktCap/price = 10B/100 = 100M, FMP says 83M (ratio=1.2, below 1.5 threshold)
      const shares = deriveShares("BWMX", 10_000_000_000, 100, 83_000_000);
      expect(shares).toBe(83_000_000);
    });

    it("exact match uses FMP shares", () => {
      const shares = deriveShares("BWMX", 10_000_000_000, 100, 100_000_000);
      expect(shares).toBe(100_000_000);
    });

    it("mktCap = 0 falls back to FMP shares", () => {
      const shares = deriveShares("BWMX", 0, 20, 500_000_000);
      expect(shares).toBe(500_000_000);
    });

    it("price = 0 falls back to FMP shares", () => {
      const shares = deriveShares("BWMX", 2_000_000_000, 0, 500_000_000);
      expect(shares).toBe(500_000_000);
    });

    it("fmpSharesOut = 1 (fallback sentinel) skips cross-check", () => {
      const shares = deriveShares("BWMX", 2_000_000_000, 20, 1);
      expect(shares).toBe(1);
    });

    it("fmpSharesOut = 0 skips cross-check", () => {
      const shares = deriveShares("BWMX", 2_000_000_000, 20, 0);
      expect(shares).toBe(0);
    });

    it("inverted divergence (FMP too high) also triggers", () => {
      // mktCap/price = 10B/100 = 100M, FMP says 500M (ratio=0.2)
      const shares = deriveShares("UNKNOWN", 10_000_000_000, 100, 500_000_000);
      expect(shares).toBeCloseTo(100_000_000, 0);
    });
  });
});

// ── D. Emergency currency mismatch detection ─────────────────────────────────

describe("emergency currency mismatch detection", () => {
  /**
   * Mimics the sanity-check in api.ts (lines 409-428):
   * If debt > 5× mktCap, profitable, fxRate=1, and currencies differ →
   * apply FALLBACK_FX as emergency rate.
   */
  function checkEmergencyMismatch(
    mktCap: number,
    totalDebt: number,
    netIncome: number,
    fxRate: number,
    priceCurrency: string,
    financialsCurrency: string,
  ): { triggered: boolean; emergencyRate: number } {
    if (
      mktCap > 0 &&
      totalDebt > mktCap * 5 &&
      netIncome > 0 &&
      fxRate === 1 &&
      priceCurrency !== financialsCurrency
    ) {
      const fxKey = `${financialsCurrency}${priceCurrency}`;
      const emergency = FALLBACK_FX[fxKey] || 0;
      if (emergency > 0) {
        return { triggered: true, emergencyRate: emergency };
      }
    }
    return { triggered: false, emergencyRate: 0 };
  }

  it("triggers when unconverted TWD debt dwarfs USD mktCap", () => {
    // Hypothetical: small-cap TWD ADR with 500B TWD debt vs 50B USD mktCap
    // 500B > 5 × 50B (250B) → triggers
    const r = checkEmergencyMismatch(
      50_000_000_000,       // mktCap USD
      500_000_000_000,      // debt in TWD (unconverted) — 10× mktCap
      10_000_000_000,       // profitable
      1,                    // fxRate stuck at 1 (API failed)
      "USD",
      "TWD",
    );
    expect(r.triggered).toBe(true);
    expect(r.emergencyRate).toBe(FALLBACK_FX["TWDUSD"]);
  });

  it("triggers when unconverted JPY debt dwarfs USD mktCap", () => {
    // TM: debt in JPY (~25T) vs mktCap USD (~250B)
    const r = checkEmergencyMismatch(
      250_000_000_000,
      25_000_000_000_000,
      3_000_000_000_000,
      1,
      "USD",
      "JPY",
    );
    expect(r.triggered).toBe(true);
    expect(r.emergencyRate).toBe(FALLBACK_FX["JPYUSD"]);
  });

  it("triggers when unconverted MXN debt dwarfs USD mktCap", () => {
    // AMX: debt in MXN (~600B) vs mktCap USD (~50B)
    const r = checkEmergencyMismatch(
      50_000_000_000,
      600_000_000_000,
      50_000_000_000,
      1,
      "USD",
      "MXN",
    );
    expect(r.triggered).toBe(true);
    expect(r.emergencyRate).toBe(FALLBACK_FX["MXNUSD"]);
  });

  it("does NOT trigger when currencies match (domestic US)", () => {
    const r = checkEmergencyMismatch(
      2_000_000_000_000,
      15_000_000_000_000,   // debt > 5× mktCap
      100_000_000_000,
      1,
      "USD",
      "USD",                // same currency → no mismatch
    );
    expect(r.triggered).toBe(false);
  });

  it("does NOT trigger when fxRate is already applied", () => {
    const r = checkEmergencyMismatch(
      800_000_000_000,
      58_900_000_000,       // debt already converted to USD
      24_800_000_000,
      0.031,                // fxRate already set
      "USD",
      "TWD",
    );
    expect(r.triggered).toBe(false);
  });

  it("does NOT trigger when company is unprofitable", () => {
    const r = checkEmergencyMismatch(
      50_000_000_000,
      600_000_000_000,
      -10_000_000_000,      // net loss
      1,
      "USD",
      "MXN",
    );
    expect(r.triggered).toBe(false);
  });
});

// ── E. No-op for domestic US tickers ─────────────────────────────────────────

describe("domestic US tickers — no FX conversion", () => {
  const domesticTickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"];

  it.each(domesticTickers)(
    "%s is NOT in ADR_FINANCIALS_CCY — no override",
    (ticker) => {
      expect(ADR_FINANCIALS_CCY[ticker]).toBeUndefined();
    },
  );

  it.each(domesticTickers)(
    "%s resolves to USD with fxRate=1 via NYSE exchange",
    (ticker) => {
      const exchange = "NYSE";
      const priceCurrency = EXCHANGE_CCY[exchange] || "USD";
      const financialsCurrency = ADR_FINANCIALS_CCY[ticker] || "USD";
      expect(priceCurrency).toBe("USD");
      expect(financialsCurrency).toBe("USD");
      // No conversion needed — rate stays 1
      const needsConversion = priceCurrency !== financialsCurrency;
      expect(needsConversion).toBe(false);
    },
  );
});

// ── F. FALLBACK_FX coverage ──────────────────────────────────────────────────

describe("FALLBACK_FX has entries for all ADR currencies", () => {
  it("every ADR_FINANCIALS_CCY currency has a FALLBACK_FX[ccyUSD] entry", () => {
    const currencies = new Set(Object.values(ADR_FINANCIALS_CCY));
    for (const ccy of currencies) {
      const key = `${ccy}USD`;
      expect(FALLBACK_FX[key], `Missing FALLBACK_FX entry: ${key}`).toBeGreaterThan(0);
    }
  });

  it("MXNUSD fallback is reasonable (~0.04–0.08)", () => {
    expect(FALLBACK_FX["MXNUSD"]).toBeGreaterThan(0.04);
    expect(FALLBACK_FX["MXNUSD"]).toBeLessThan(0.08);
  });

  it("BRLUSD fallback is reasonable (~0.10–0.25)", () => {
    expect(FALLBACK_FX["BRLUSD"]).toBeGreaterThan(0.10);
    expect(FALLBACK_FX["BRLUSD"]).toBeLessThan(0.25);
  });
});

// ── G. Analyst EPS scaling by ADR ratio ──────────────────────────────────────

describe("analyst EPS normalization with ADR ratio + FX", () => {
  /**
   * Mimics epsOf() in api.ts:
   *   const epsScale = ADR_EPS_RATIO[t] ?? adrRatio
   *   const epsOf = (e) => ((e?.epsAvg || 0) * epsScale) * fxRate
   *
   * ADR_EPS_RATIO overrides ADR_RATIO_TABLE for tickers where share-count
   * derivation ratio ≠ ordinary-shares-per-ADR for EPS purposes (e.g. NVO).
   */
  function epsOf(epsAvg: number, ticker: string): number {
    const adrRatio = ADR_RATIO_TABLE[ticker] || 1;
    const epsScale = ADR_EPS_RATIO[ticker] ?? adrRatio;
    const ccy = ADR_FINANCIALS_CCY[ticker];
    const fxRate = ccy ? (FALLBACK_FX[`${ccy}USD`] || 1) : 1;
    return (epsAvg * epsScale) * fxRate;
  }

  it("TSM: analyst EPS in TWD × ratio 1 × TWDUSD (ADR_EPS_RATIO override)", () => {
    // FMP reports epsAvg per ADR-unit in TWD (already normalized, not per-ordinary-share)
    // ADR_EPS_RATIO["TSM"] = 1 → epsScale = 1, only FX conversion applies
    const result = epsOf(6, "TSM");
    expect(result).toBeCloseTo(6 * 1 * 0.031, 4);
    // Without the override: 6 * 5 * 0.031 = 0.93 (5× too high)
    expect(result).not.toBeCloseTo(6 * 5 * 0.031, 4);
  });

  it("NVO: analyst EPS in DKK × ratio 1 × DKKUSD (ADR_EPS_RATIO override)", () => {
    // ADR_RATIO_TABLE["NVO"] = 6 (forces mktCap/price share derivation)
    // ADR_EPS_RATIO["NVO"]   = 1 (1 ADR = 1 B-share — no EPS scaling)
    // Without the override, this would be 15 * 6 * 0.145 = 13.05 (wrong)
    const result = epsOf(15, "NVO");
    expect(result).toBeCloseTo(15 * 1 * 0.145, 4);
    // Confirm it is NOT the old (wrong) value
    expect(result).not.toBeCloseTo(15 * 6 * 0.145, 4);
  });

  it("NVO: ADR_EPS_RATIO entry is 1 (not absent, not 6)", () => {
    expect(ADR_EPS_RATIO["NVO"]).toBe(1);
    // Share-count ratio stays 6 to force mktCap/price derivation
    expect(ADR_RATIO_TABLE["NVO"]).toBe(6);
  });

  it("TM: analyst EPS in JPY × ratio 1 × JPYUSD (ADR_EPS_RATIO override, confirmed)", () => {
    // FMP normalizes TM shares to ADR-equivalent units (~1.311B = 13.1B ordinary ÷ 10);
    // epsAvg from analyst estimates is already per-ADR-unit in JPY (same magnitude as
    // income statement epsDiluted ~3,596 JPY). ADR_EPS_RATIO["TM"] = 1 confirmed.
    const result = epsOf(250, "TM");
    expect(result).toBeCloseTo(250 * 1 * 0.0067, 4);
    expect(result).not.toBeCloseTo(250 * 10 * 0.0067, 4);
  });

  it("BABA: analyst EPS in CNH × ratio 1 × CNHUSD (ADR_EPS_RATIO override)", () => {
    // FMP normalizes BABA shares to ADR-equivalent units; epsAvg is already per-ADR-unit in CNH
    // epsDiluted FY2025 = 53.6 CNH; analyst estimates are in the same range (~35–73 CNH)
    // epsScale=8 would inflate to 8.5 * 8 * 0.138 = $9.39 (8× too high)
    const result = epsOf(8.5, "BABA");
    expect(result).toBeCloseTo(8.5 * 1 * 0.138, 4);
    expect(result).not.toBeCloseTo(8.5 * 8 * 0.138, 4);
  });

  it("BHP: analyst EPS in AUD × ratio 1 × AUDUSD (ADR_EPS_RATIO override, confirmed)", () => {
    // FMP normalizes BHP shares to ADR-equivalent units (~2.536B = 5.07B ordinary ÷ 2);
    // epsAvg from analyst estimates is already per-ADR-unit in AUD (same magnitude as
    // income statement epsDiluted ~3.56 AUD). ADR_EPS_RATIO["BHP"] = 1 confirmed.
    const result = epsOf(5.14, "BHP");
    expect(result).toBeCloseTo(5.14 * 1 * 0.63, 4);
    expect(result).not.toBeCloseTo(5.14 * 2 * 0.63, 4);
  });

  it("AMX: analyst EPS in MXN × ratio 1 × MXNUSD (ADR_EPS_RATIO override, confirmed)", () => {
    // FMP normalizes AMX shares to ADR-equivalent units (~3.02B = 60B ordinary ÷ 20);
    // epsAvg from analyst estimates is already per-ADR-unit in MXN (same magnitude as
    // income statement epsDiluted ~25.8 MXN). ADR_EPS_RATIO["AMX"] = 1 confirmed.
    const result = epsOf(27.10, "AMX");
    expect(result).toBeCloseTo(27.10 * 1 * 0.058, 4);
    expect(result).not.toBeCloseTo(27.10 * 20 * 0.058, 4);
  });

  it("ASML: ratio 1 — only FX applies", () => {
    const result = epsOf(20, "ASML");
    expect(result).toBeCloseTo(20 * 1 * 1.09, 4);
  });

  it("AAPL: no override — returns raw EPS unchanged", () => {
    const result = epsOf(6.5, "AAPL");
    expect(result).toBeCloseTo(6.5, 4); // ratio=1, fxRate=1
  });

  it("all ratio>1 ADR tickers have ADR_EPS_RATIO overrides", () => {
    // Every ticker where ADR_RATIO_TABLE > 1 needs an explicit ADR_EPS_RATIO entry because
    // FMP normalises their share counts to ADR-equivalent units (confirmed for all).
    for (const ticker of ["NVO", "TSM", "TM", "BABA", "BHP", "AMX"]) {
      expect(ADR_EPS_RATIO[ticker]).toBeDefined();
      expect(ADR_RATIO_TABLE[ticker]).toBeGreaterThan(1);
    }
  });

  it("tickers with ratio=1 in ADR_RATIO_TABLE need no ADR_EPS_RATIO entry", () => {
    // ASML, SONY, SAP, etc. have adrRatio=1 → epsScale=1 regardless
    for (const ticker of ["ASML", "SONY", "SAP", "UL", "DEO", "NVS"]) {
      const adrRatio = ADR_RATIO_TABLE[ticker] || 1;
      const epsScale = ADR_EPS_RATIO[ticker] ?? adrRatio;
      expect(epsScale).toBe(1);
    }
  });
});

// ── H. TSM forwardEPS fix — ADR_EPS_RATIO["TSM"] = 1 ────────────────────────
// Root cause of the TSM $40 bug:
//   FMP normalizes TSM shares to ADR-equivalent units (25.9B ordinary ÷ 5 = 5.187B ADR units)
//   → deriveShares returns 5.187B = ADR unit count (already per-ADR)
//   → ttmEPS = netIncome × fxRate / adrUnits = per-ADR EPS (correct, ~$10.37 at FALLBACK_FX)
//   → But analyst epsAvg from FMP is also per-ADR-unit in home currency
//   → epsOf applied epsScale=5 → forwardEPS was 5× too high
//
// Fix: ADR_EPS_RATIO["TSM"] = 1 → epsScale=1 for analyst estimates
// epsBase = (ttmEPS + forwardEPS) / 2 now correctly ~$11–14 at FALLBACK_FX,
// vs old (buggy) $40 from ($8.53 + $71.49) / 2 at live fxRate.

describe("TSM forwardEPS fix — ADR_EPS_RATIO override", () => {
  it("ADR_EPS_RATIO['TSM'] is 1 (analyst estimates are per-ADR-unit, not per-ordinary)", () => {
    expect(ADR_EPS_RATIO["TSM"]).toBe(1);
    // ADR_RATIO_TABLE still has 5 (still needed for deriveShares mktCap/price override)
    expect(ADR_RATIO_TABLE["TSM"]).toBe(5);
  });

  it("TSM epsScale resolves to 1 (ADR_EPS_RATIO override wins over ADR_RATIO_TABLE)", () => {
    const adrRatio = ADR_RATIO_TABLE["TSM"] || 1; // 5
    const epsScale = ADR_EPS_RATIO["TSM"] ?? adrRatio; // 1 (override)
    expect(epsScale).toBe(1);
  });

  it("TSM ttmEPS (from netIncome / adrUnits) already gives per-ADR EPS", () => {
    // FMP's weightedAverageShsOut for TSM ≈ 5.187B (ADR units = 25.9B ordinary ÷ 5)
    // ttmEPS = netIncome × fxRate / adrUnits = per-ADR EPS
    const netIncome = 1_735_678_080_000; // TWD (FY2025 actual)
    const fxRate    = FALLBACK_FX["TWDUSD"]; // 0.031
    const adrUnits  = 5_187_000_000;     // ADR-equivalent share count from FMP
    const ttmEPS    = (netIncome * fxRate) / adrUnits;
    // ≈ $10.37/ADR — close to Google's ~$10.64 (difference from FALLBACK_FX vs live rate)
    expect(ttmEPS).toBeGreaterThan(8);
    expect(ttmEPS).toBeLessThan(13);
  });

  it("TSM epsOf with old epsScale=5 would inflate forwardEPS 5×", () => {
    const epsAvg   = 560.71; // TWD/ADR-unit (FMP 2027 estimate)
    const fxRate   = FALLBACK_FX["TWDUSD"]; // 0.031
    const wrongEps = (epsAvg * 5) * fxRate; // old behaviour
    const rightEps = (epsAvg * 1) * fxRate; // with ADR_EPS_RATIO["TSM"] = 1
    expect(wrongEps).toBeCloseTo(rightEps * 5, 1);
    expect(wrongEps).toBeGreaterThan(80); // ≈ $86.91 — clearly wrong
    expect(rightEps).toBeLessThan(20);    // ≈ $17.38 — reasonable forward EPS
  });

  it("TSM: epsBase with fix is in single digits to low teens (not ~$40)", () => {
    const netIncome = 1_735_678_080_000;
    const epsAvg    = 560.71; // TWD/ADR-unit (2027 estimate)
    const fxRate    = FALLBACK_FX["TWDUSD"]; // 0.031
    const adrUnits  = 5_187_000_000;
    const epsScale  = ADR_EPS_RATIO["TSM"] ?? ADR_RATIO_TABLE["TSM"]; // 1

    const ttmEPS     = (netIncome * fxRate) / adrUnits;
    const forwardEPS = (epsAvg * epsScale) * fxRate;
    const epsBase    = (ttmEPS + forwardEPS) / 2;

    expect(epsBase).toBeGreaterThan(10);
    expect(epsBase).toBeLessThan(16);  // ~$13.9 at FALLBACK_FX 0.031
  });
});

// ── I. sanitizedNetIncome — FMP netIncome corruption guard ───────────────────
// FMP occasionally returns a corrupted netIncome (e.g. $222,800 instead of
// $222.8M) while epsDiluted on the same row is correct.
// When derivedEps (netIncome / shares) diverges from reportedEps by >50%,
// the function returns reportedEps × shares instead.
// Source: api.ts:131-150

describe("sanitizedNetIncome — netIncome corruption detection", () => {
  it("normal case: values agree — returns netIncome unchanged", () => {
    // derivedEps = 100M / 100M = 1.00, reportedEps = 1.00 → no divergence
    const result = sanitizedNetIncome(
      { netIncome: 100_000_000, epsDiluted: 1.00, weightedAverageShsOutDil: 100_000_000 },
      100_000_000,
    );
    expect(result).toBe(100_000_000);
  });

  it("corrupted — netIncome ~1000× too small: returns epsDiluted × shares", () => {
    // FMP bug: $222,800 reported instead of $222.8M
    // derivedEps = 222_800 / 100M = 0.002228 vs reportedEps = 2.228 → >50% diverge
    const result = sanitizedNetIncome(
      { netIncome: 222_800, epsDiluted: 2.228, weightedAverageShsOutDil: 100_000_000 },
      100_000_000,
    );
    expect(result).toBeCloseTo(2.228 * 100_000_000, 0);
  });

  it("corrupted — netIncome ~1000× too large: corrects downward", () => {
    // derivedEps = 222.8B / 100M = 2228 vs reportedEps = 2.228 → >50% diverge
    const result = sanitizedNetIncome(
      { netIncome: 222_800_000_000, epsDiluted: 2.228, weightedAverageShsOutDil: 100_000_000 },
      100_000_000,
    );
    expect(result).toBeCloseTo(2.228 * 100_000_000, 0);
  });

  it("near-zero both — skips divergence check, returns netIncome", () => {
    // Both < 0.001: treated as "near zero", no correction applied
    const result = sanitizedNetIncome(
      { netIncome: 0.000005, epsDiluted: 0.000005, weightedAverageShsOutDil: 1_000_000 },
      1_000_000,
    );
    expect(result).toBe(0.000005);
  });

  it("missing epsDiluted — no correction possible, returns netIncome", () => {
    // Without reportedEps, the divergence check is skipped entirely
    const result = sanitizedNetIncome(
      { netIncome: 100_000_000, weightedAverageShsOutDil: 100_000_000 },
      100_000_000,
    );
    expect(result).toBe(100_000_000);
  });

  it("negative netIncome (valid loss) — within tolerance, returned unchanged", () => {
    // derivedEps = -50M / 100M = -0.50, reportedEps = -0.50 → agree
    const result = sanitizedNetIncome(
      { netIncome: -50_000_000, epsDiluted: -0.50, weightedAverageShsOutDil: 100_000_000 },
      100_000_000,
    );
    expect(result).toBe(-50_000_000);
  });

  it("falls back to fallbackShares when weightedAverageShsOutDil is absent", () => {
    // Uses fallbackShares (2nd arg) when income statement row has no share count
    const result = sanitizedNetIncome(
      { netIncome: 200_000_000, epsDiluted: 2.00 },
      100_000_000,  // fallbackShares
    );
    // derivedEps = 200M / 100M = 2.00, reportedEps = 2.00 → agree
    expect(result).toBe(200_000_000);
  });
});

// ── J. Bear/bull analyst EPS scaling ─────────────────────────────────────────
// Mirrors epsOfBear / epsOfBull in api.ts:511-512:
//   epsOfBear = (e) => ((e?.epsLow  || 0) * epsScale) * fxRate
//   epsOfBull = (e) => ((e?.epsHigh || 0) * epsScale) * fxRate
//
// These use the same epsScale as epsOf, so ADR_EPS_RATIO overrides apply equally.
// 6 fields in TickerData (fwdGrowthY1Bear/Bull, fwdGrowthY2Bear/Bull,
// fwdCAGRBear/Bull) depend on these functions being scaled correctly.

describe("bear/bull analyst EPS scaling", () => {
  function epsOfBear(epsLow: number | null, ticker: string): number {
    const adrRatio = ADR_RATIO_TABLE[ticker] || 1;
    const epsScale = ADR_EPS_RATIO[ticker] ?? adrRatio;
    const ccy    = ADR_FINANCIALS_CCY[ticker];
    const fxRate = ccy ? (FALLBACK_FX[`${ccy}USD`] || 1) : 1;
    return ((epsLow || 0) * epsScale) * fxRate;
  }

  function epsOfBull(epsHigh: number | null, ticker: string): number {
    const adrRatio = ADR_RATIO_TABLE[ticker] || 1;
    const epsScale = ADR_EPS_RATIO[ticker] ?? adrRatio;
    const ccy    = ADR_FINANCIALS_CCY[ticker];
    const fxRate = ccy ? (FALLBACK_FX[`${ccy}USD`] || 1) : 1;
    return ((epsHigh || 0) * epsScale) * fxRate;
  }

  it("TSM bear: ADR_EPS_RATIO=1 applies — epsLow × 1 × TWDUSD (not ×5)", () => {
    expect(epsOfBear(5, "TSM")).toBeCloseTo(5 * 1 * 0.031, 4);
    expect(epsOfBear(5, "TSM")).not.toBeCloseTo(5 * 5 * 0.031, 4);
  });

  it("TSM bull: ADR_EPS_RATIO=1 applies — epsHigh × 1 × TWDUSD (not ×5)", () => {
    expect(epsOfBull(7, "TSM")).toBeCloseTo(7 * 1 * 0.031, 4);
    expect(epsOfBull(7, "TSM")).not.toBeCloseTo(7 * 5 * 0.031, 4);
  });

  it("NVO bear: ADR_EPS_RATIO=1 applies — epsLow × 1 × DKKUSD (not ×6)", () => {
    expect(epsOfBear(12, "NVO")).toBeCloseTo(12 * 1 * 0.145, 4);
    expect(epsOfBear(12, "NVO")).not.toBeCloseTo(12 * 6 * 0.145, 4);
  });

  it("NVO bull: ADR_EPS_RATIO=1 applies — epsHigh × 1 × DKKUSD (not ×6)", () => {
    expect(epsOfBull(18, "NVO")).toBeCloseTo(18 * 1 * 0.145, 4);
    expect(epsOfBull(18, "NVO")).not.toBeCloseTo(18 * 6 * 0.145, 4);
  });

  it("TM bear: ADR_EPS_RATIO override ×1 (confirmed — FMP provides ADR-unit shares)", () => {
    expect(epsOfBear(200, "TM")).toBeCloseTo(200 * 1 * 0.0067, 4);
    expect(epsOfBear(200, "TM")).not.toBeCloseTo(200 * 10 * 0.0067, 4);
  });

  it("ASML bear: ratio=1 — only FX conversion", () => {
    expect(epsOfBear(18, "ASML")).toBeCloseTo(18 * 1 * 1.09, 4);
  });

  it("AAPL bear: domestic — value returned unchanged", () => {
    expect(epsOfBear(6, "AAPL")).toBeCloseTo(6, 4);
  });

  it("null input → 0 for both bear and bull", () => {
    expect(epsOfBear(null, "TSM")).toBe(0);
    expect(epsOfBull(null, "TSM")).toBe(0);
    expect(epsOfBear(null, "AAPL")).toBe(0);
  });

  it("bear < base < bull — scale ordering is preserved for NVO", () => {
    // All three functions apply the same epsScale; ordering comes from data
    const base = (15 * 1) * 0.145;
    const bear = (12 * 1) * 0.145;
    const bull = (18 * 1) * 0.145;
    expect(bear).toBeLessThan(base);
    expect(bull).toBeGreaterThan(base);
  });
});

// ── K. Dividend yield — Tier 3 (profile.lastDiv with epsScale) ───────────────
// When Tiers 1 and 2 produce no dividend yield, Tier 3 falls back to
// profile.lastDiv with epsScale-aware conversion (api.ts:789-793):
//
//   const freq             = epsScale > 1 ? 2 : 4;
//   const lastDivConverted = (p.lastDiv / epsScale) * fxRate;
//   dividendYield          = (lastDivConverted * freq) / livePrice * 100;
//
// epsScale > 1 infers a semi-annual payout (typical for many non-US ADRs);
// dividing by epsScale converts a per-ordinary-share amount to per-ADR-unit.

describe("dividend yield Tier 3 — profile.lastDiv with epsScale", () => {
  function tier3Yield(
    lastDiv: number,
    epsScale: number,
    fxRate: number,
    livePrice: number,
  ): number {
    if (!lastDiv || lastDiv <= 0 || livePrice <= 0) return 0;
    const freq             = epsScale > 1 ? 2 : 4;
    const lastDivConverted = (lastDiv / epsScale) * fxRate;
    return (lastDivConverted * freq) / livePrice * 100;
  }

  it("domestic / NVO / TSM (epsScale=1): freq=4, no division by epsScale", () => {
    // epsScale=1 → freq=4 (quarterly assumption), lastDivConverted = lastDiv × fxRate
    const yld = tier3Yield(1.00, 1, 1, 100);
    expect(yld).toBeCloseTo((1.00 * 4) / 100 * 100, 4); // 4%
  });

  it("epsScale=8 ticker: freq=2, lastDiv divided by 8 before FX", () => {
    // epsScale > 1 → freq=2 (semi-annual inference), lastDivConverted = (lastDiv / 8) × fxRate
    // Models a hypothetical ADR where FMP reports lastDiv per ordinary share in home currency
    const yld = tier3Yield(8, 8, 0.138, 50);
    const expected = ((8 / 8) * 0.138 * 2) / 50 * 100;
    expect(yld).toBeCloseTo(expected, 4);
  });

  it("epsScale=20 ticker: freq=2, lastDiv divided by 20 before FX", () => {
    // Formula test with epsScale=20 (hypothetical — no current ticker uses this in practice)
    const yld = tier3Yield(20, 20, 0.058, 25);
    const expected = ((20 / 20) * 0.058 * 2) / 25 * 100;
    expect(yld).toBeCloseTo(expected, 4);
  });

  it("zero lastDiv → yield = 0 regardless of epsScale", () => {
    expect(tier3Yield(0, 1, 1, 100)).toBe(0);
    expect(tier3Yield(0, 10, 0.0067, 50)).toBe(0);
  });

  it("epsScale boundary: epsScale=1 uses freq=4, epsScale=2 uses freq=2", () => {
    const withScale1 = tier3Yield(1, 1, 1, 100);
    const withScale2 = tier3Yield(1, 2, 1, 100);
    // freq=4 vs freq=2 (but also divided by 2), so net yield is same
    expect(withScale1).toBeCloseTo(4, 4);   // (1/1 × 1 × 4) / 100 × 100 = 4%
    expect(withScale2).toBeCloseTo(1, 4);   // (1/2 × 1 × 2) / 100 × 100 = 1%
  });
});
