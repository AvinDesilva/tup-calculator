import { describe, it, expect } from "vitest";
import {
  ADR_FINANCIALS_CCY,
  ADR_RATIO_TABLE,
  FALLBACK_FX,
  EXCHANGE_CCY,
} from "./constants.ts";
import { deriveShares } from "./api.ts";

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
   *   totalDebt = rawDebt * fxRate
   *   totalCash = rawCash * fxRate
   *   ttmEPS    = (rawNetIncome * fxRate) / adrShares
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

  it("TSM (Taiwan, TWD) — debt converts correctly", () => {
    const fx = getFxRate("TWD"); // 0.031
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
   *   const epsOf = (e) => ((e?.epsAvg || 0) * adrRatio) * fxRate
   */
  function epsOf(epsAvg: number, ticker: string): number {
    const adrRatio = ADR_RATIO_TABLE[ticker] || 1;
    const ccy = ADR_FINANCIALS_CCY[ticker];
    const fxRate = ccy ? (FALLBACK_FX[`${ccy}USD`] || 1) : 1;
    return (epsAvg * adrRatio) * fxRate;
  }

  it("TSM: analyst EPS in TWD × ratio 5 × TWDUSD", () => {
    // FMP might report EPS per ordinary share (~6 TWD)
    const result = epsOf(6, "TSM");
    expect(result).toBeCloseTo(6 * 5 * 0.031, 4);
  });

  it("NVO: analyst EPS in DKK × ratio 6 × DKKUSD", () => {
    const result = epsOf(15, "NVO");
    expect(result).toBeCloseTo(15 * 6 * 0.145, 4);
  });

  it("TM: analyst EPS in JPY × ratio 10 × JPYUSD", () => {
    const result = epsOf(250, "TM");
    expect(result).toBeCloseTo(250 * 10 * 0.0067, 4);
  });

  it("BABA: analyst EPS in CNH × ratio 8 × CNHUSD", () => {
    const result = epsOf(8.5, "BABA");
    expect(result).toBeCloseTo(8.5 * 8 * 0.138, 4);
  });

  it("AMX: analyst EPS in MXN × ratio 20 × MXNUSD", () => {
    const result = epsOf(1.2, "AMX");
    expect(result).toBeCloseTo(1.2 * 20 * 0.058, 4);
  });

  it("ASML: ratio 1 — only FX applies", () => {
    const result = epsOf(20, "ASML");
    expect(result).toBeCloseTo(20 * 1 * 1.09, 4);
  });

  it("AAPL: no override — returns raw EPS unchanged", () => {
    const result = epsOf(6.5, "AAPL");
    expect(result).toBeCloseTo(6.5, 4); // ratio=1, fxRate=1
  });
});
