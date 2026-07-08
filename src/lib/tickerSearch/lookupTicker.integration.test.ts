import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupTicker } from "./api.ts";

// End-to-end coverage for lookupTicker's data wiring — specifically that the
// /dividends response is threaded into the dividend resolver via the correct
// Promise.all destructuring slot. Unit tests on resolveDividendYield can't
// catch a mis-ordered Promise.all; this stubs global fetch and drives the
// whole fetch → derive → return path.
//
// Regression guard for the class of bug that shipped: a dividend payer whose
// forward yield silently resolved to 0%.

function jsonRes(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: { get: () => null },
  } as unknown as Response;
}

// Minimal-but-valid WSM-shaped payloads. Each endpoint returns distinct,
// identifiable data so a mis-wire surfaces rather than silently "works".
const PRICE = 222.49;
const SHARES = 123e6;

const WSM_PROFILE = {
  companyName: "Williams-Sonoma, Inc.",
  sector: "Consumer Cyclical",
  industry: "Specialty Retail",
  exchangeShortName: "NYSE",
  currency: "USD",
  country: "US",
  mktCap: PRICE * SHARES,
  price: PRICE,
  lastDividend: 2.74, // stable field; trailing annual (Tier 3 fallback)
};

const WSM_QUOTE = {
  price: PRICE,
  priceAvg200: 205,
  sharesOutstanding: SHARES,
  marketCap: PRICE * SHARES,
  // NB: stable /quote has no dividendYield field — omitted on purpose.
};

const WSM_BALANCE = [{ totalDebt: 1.25e9, cashAndShortTermInvestments: 1.2e9, totalAssets: 5e9 }];

const WSM_INCOME = [
  { revenue: 7.7e9, netIncome: 1.05e9, weightedAverageShsOutDil: SHARES, eps: 8.5, epsDiluted: 8.5, reportingCurrency: "USD" },
  { revenue: 7.3e9, netIncome: 0.95e9, weightedAverageShsOutDil: SHARES, eps: 7.7, epsDiluted: 7.7, reportingCurrency: "USD" },
  { revenue: 6.8e9, netIncome: 0.90e9, weightedAverageShsOutDil: SHARES, eps: 7.3, epsDiluted: 7.3, reportingCurrency: "USD" },
];

// The authoritative dividend feed: $0.76 quarterly ⇒ $3.04 annual ⇒ ~1.37%.
const WSM_DIVIDENDS = [
  { date: "2026-07-17", adjDividend: 0.76, dividend: 0.76, frequency: "Quarterly" },
  { date: "2026-04-17", adjDividend: 0.76, dividend: 0.76, frequency: "Quarterly" },
  { date: "2026-01-16", adjDividend: 0.66, dividend: 0.66, frequency: "Quarterly" },
  { date: "2025-10-17", adjDividend: 0.66, dividend: 0.66, frequency: "Quarterly" },
];

function installFetchMock(overrides: { dividends?: unknown } = {}) {
  const fetchMock = vi.fn((url: string | URL) => {
    const u = String(url);
    if (u.includes("/api/historical-price")) return Promise.resolve(jsonRes({ priceHistory: [] }));
    if (u.includes("/profile")) return Promise.resolve(jsonRes([WSM_PROFILE]));
    if (u.includes("/balance-sheet-statement")) return Promise.resolve(jsonRes(WSM_BALANCE));
    if (u.includes("/income-statement")) return Promise.resolve(jsonRes(WSM_INCOME));
    if (u.includes("/analyst-estimates")) return Promise.resolve(jsonRes([]));
    if (u.includes("/dividends")) return Promise.resolve(jsonRes(overrides.dividends ?? WSM_DIVIDENDS));
    if (u.includes("/cash-flow-statement")) return Promise.resolve(jsonRes([{ operatingCashFlow: 1.1e9, freeCashFlow: 0.9e9 }]));
    if (u.includes("/quote")) return Promise.resolve(jsonRes([WSM_QUOTE]));
    return Promise.resolve(jsonRes([]));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("lookupTicker — dividend yield end-to-end wiring", () => {
  it("WSM resolves to a nonzero forward yield (~1.37%), not 0%", async () => {
    installFetchMock();
    const data = await lookupTicker("WSM", () => {});
    expect(data.dividendYield).toBeGreaterThan(1.3);
    expect(data.dividendYield).toBeLessThan(1.4);
  });

  it("the yield is sourced from the /dividends tier — proves the response reaches the resolver", async () => {
    installFetchMock();
    const data = await lookupTicker("WSM", () => {});
    // divNote from Tier 1 begins with "adjDiv …"; a mis-wired Promise.all slot
    // (e.g. cash-flow objects landing where divHistory is expected) would fall
    // through to the profile note or "unavailable" instead.
    expect(data.divNote).toMatch(/^adjDiv/);
    expect(data.divNote).toContain("Quarterly");
  });

  it("still surfaces a nonzero yield via the profile fallback when /dividends is empty", async () => {
    installFetchMock({ dividends: [] });
    const data = await lookupTicker("WSM", () => {});
    // Tier 1 empty → Tier 3 (profile.lastDividend 2.74 / 222.49 ≈ 1.23%).
    expect(data.dividendYield).toBeGreaterThan(1.2);
    expect(data.divNote).toContain("lastDividend");
  });
});
