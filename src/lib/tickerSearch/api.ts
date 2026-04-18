import { ADR_RATIO_TABLE, ADR_EPS_RATIO, ADR_FINANCIALS_CCY, COUNTRY_CCY, EXCHANGE_CCY, FALLBACK_FX, MKTCAP_RANGES } from "../constants.ts";
import { f, fB } from "../utils.ts";
import { classifyLifecycle } from "../companyScorecard/lifecycle.ts";
import type {
  TickerData, HistoricalPricePoint, LifecycleStage, RollFilters,
  FMPProfile, FMPQuote, FMPBalanceSheet, FMPIncomeStatement,
  FMPEstimate,
  FMPDividend, FMPDividendHistory, FMPDCF,
  FMPEarningSurprise, FMPCashFlow, EpsGrowthPoint,
} from "../types.ts";

// ─── Industry Growth ──────────────────────────────────────────────────────────

export interface IndustryGrowthData {
  industry: string;
  median: number;
  p25: number;
  p75: number;
  count: number;
  constituents: string[];
  error?: string;
}

export async function fetchIndustryGrowth(industry: string, exclude?: string): Promise<IndustryGrowthData | null> {
  try {
    const params = new URLSearchParams({ industry });
    if (exclude) params.set("exclude", exclude);
    const res = await fetch(`/api/industry-growth?${params}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ─── Ticker Search ────────────────────────────────────────────────────────────

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  currency?: string;
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=10`);
    if (!res.ok) return [];
    return (await res.json()) as SearchResult[];
  } catch {
    return [];
  }
}

// ─── Dice-roll stock pool (company-screener) ─────────────────────────────────

const _screenedCache: Record<string, string[]> = {};

export async function fetchFilteredPool(filters: RollFilters): Promise<string[]> {
  const cacheKey = `${filters.sector}|${filters.exchange.sort().join(",")}|${filters.marketCap.sort().join(",")}|${filters.indexEtf}`;
  if (_screenedCache[cacheKey]) return _screenedCache[cacheKey];

  // Build FMP company-screener query params (stable API replacement for legacy stock-screener)
  const params: string[] = ["isActivelyTrading=true", "limit=5000"];
  if (filters.sector) params.push(`sector=${encodeURIComponent(filters.sector)}`);
  if (filters.marketCap.length > 0) {
    // Compute widest range across selected tiers for the API query
    const ranges = filters.marketCap.map(t => MKTCAP_RANGES[t]);
    const minVal = Math.min(...ranges.map(r => r.min));
    const maxVal = Math.max(...ranges.map(r => r.max));
    if (minVal > 0) params.push(`marketCapMoreThan=${minVal}`);
    if (maxVal < Infinity) params.push(`marketCapLowerThan=${maxVal}`);
  }

  const results = await fetchFMP<Array<{ symbol: string; exchangeShortName?: string; marketCap?: number; isEtf?: boolean; isFund?: boolean }>>(
    `company-screener?${params.join("&")}`
  );

  const symbols = (results || [])
    .filter(r => {
      if (!r.symbol || r.symbol.includes(".")) return false;
      // Exclude ETFs and funds
      if (r.isEtf || r.isFund) return false;
      const ex = (r.exchangeShortName || "").toUpperCase();
      // Exchange filter — empty array = NYSE+NASDAQ default (VTI-like universe)
      const sel = filters.exchange;
      if (!sel.length) {
        if (ex !== "NYSE" && ex !== "NASDAQ" && ex !== "AMEX" && ex !== "NYSEAMERICAN") return false;
      } else {
        const match = sel.some(f => {
          if (f === "NYSE") return ex === "NYSE" || ex === "AMEX" || ex === "NYSEAMERICAN";
          if (f === "NASDAQ") return ex === "NASDAQ";
          if (f === "LSE") return ex === "LSE";
          if (f === "TSX") return ex === "TSX" || ex === "TSXV";
          return false;
        });
        if (!match) return false;
      }
      // Market cap precise filter (handles non-contiguous multi-select like Micro+Large)
      if (filters.marketCap.length > 1 && r.marketCap != null) {
        const inTier = filters.marketCap.some(t => {
          const rng = MKTCAP_RANGES[t];
          return r.marketCap! >= rng.min && r.marketCap! < rng.max;
        });
        if (!inTier) return false;
      }
      return true;
    })
    .map(r => r.symbol.toUpperCase());

  _screenedCache[cacheKey] = symbols;
  return symbols;
}

// ─── Low-level HTTP wrapper ───────────────────────────────────────────────────

export async function fetchFMP<T = unknown>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/fmp/${endpoint}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    if (res.status === 401) throw new Error("Invalid API key.");
    if (res.status === 429) throw new Error("API rate limit reached. Try again later.");
    if (res.status === 404) { console.warn(`[fetchFMP] 404 /${endpoint}`); }
    else { console.error(`[fetchFMP] FAIL ${res.status} /${endpoint}`, body); }
    throw new Error(`Unable to fetch market data (HTTP ${res.status}: ${endpoint.split("?")[0]}). Please try again.`);
  }
  return res.json() as T;
}

// ─── Net income sanity check ──────────────────────────────────────────────────
// FMP occasionally returns a corrupted netIncome (e.g. $222,800 instead of
// $222.8M) while the eps/epsDiluted fields on the same row are correct.
// When the two diverge by more than 50%, trust epsDiluted × diluted shares.
export function sanitizedNetIncome(y: FMPIncomeStatement, fallbackShares: number): number {
  const ni = y.netIncome ?? 0;
  const sh = y.weightedAverageShsOutDil || y.weightedAverageShsOut || fallbackShares;
  const reportedEps = y.epsDiluted ?? y.eps;
  if (reportedEps != null && sh > 0) {
    const derivedEps = sh > 0 ? ni / sh : 0;
    const expectedNi = reportedEps * sh;
    // If both are near-zero, no divergence to detect
    if (Math.abs(derivedEps) < 0.001 && Math.abs(reportedEps) < 0.001) return ni;
    // Check for >50% divergence between derived EPS and reported EPS
    const ref = Math.max(Math.abs(derivedEps), Math.abs(reportedEps));
    if (ref > 0 && Math.abs(derivedEps - reportedEps) / ref > 0.5) {
      if (import.meta.env.DEV) {
        console.warn(`[TUP SANITY] netIncome=${ni} → EPS=${derivedEps.toFixed(4)}, but epsDiluted=${reportedEps} → using ${expectedNi.toFixed(0)}`);
      }
      return expectedNi;
    }
  }
  return ni;
}

/**
 * Derives shares outstanding with cross-check against mktCap / price.
 * Priority:
 *   1. ADR_RATIO_TABLE entry with ratio > 1: always use mktCap / price
 *   2. Divergence check: if mktCap / price differs from FMP sharesOutstanding
 *      by more than 50%, prefer mktCap / price (likely wrong share class)
 *   3. Fall back to FMP sharesOutstanding
 */
export function deriveShares(
  ticker: string,
  mktCap: number,
  price: number,
  fmpSharesOut: number,
  log?: (msg: string) => void,
): number {
  const adrRatio = ADR_RATIO_TABLE[ticker] || 1;

  // ADR override: unconditional for known ADR ratios > 1
  if (adrRatio > 1 && mktCap > 0 && price > 0) {
    return mktCap / price;
  }

  // Cross-check: if mktCap/price diverges >50% from FMP shares, prefer derived
  if (mktCap > 0 && price > 0 && fmpSharesOut > 1) {
    const derived = mktCap / price;
    const ratio = derived / fmpSharesOut;
    if (ratio > 1.5 || ratio < 1 / 1.5) {
      log?.(`  ⚠ Shares cross-check: FMP=${fmpSharesOut.toFixed(0)} vs derived=${derived.toFixed(0)} — using derived`);
      return derived;
    }
  }

  return fmpSharesOut;
}

// ─── Quick data fetch (4 endpoints — for dice roll validation) ────────────────

export interface QuickTickerData {
  marketCap: number;
  sector: string;
  exchange: string;
  debt: number;
  cash: number;
  shares: number;
  ttmEPS: number;
  forwardEPS: number;
  historicalGrowth5yr: number;
  analystGrowth: number;
  fwdGrowthY1: number;
  fwdGrowthY2: number | null;
  fwdCAGR: number | null;
  revenuePerShare: number;
  targetMargin: number;
  inceptionGrowth: number;
  breakEvenYear: number;
  currentPrice: number;
  sma200: number;
  dividendYield: number;
  operatingMargin: number | null;
  lifecycleStage: LifecycleStage | null;
}

/**
 * Lightweight fetch — only 4 FMP endpoints (profile, quote, balance-sheet, income).
 * Returns enough data to build an InputState and run calcTUP for screening.
 */
export async function lookupTickerQuick(ticker: string): Promise<QuickTickerData> {
  const t = ticker.trim().toUpperCase();

  const [profile, quote, balanceSheet, income] = await Promise.all([
    fetchFMP<FMPProfile[]>(`profile?symbol=${t}`),
    fetchFMP<FMPQuote[]>(`quote?symbol=${t}`),
    fetchFMP<FMPBalanceSheet[]>(`balance-sheet-statement?symbol=${t}&limit=2`),
    fetchFMP<FMPIncomeStatement[]>(`income-statement?symbol=${t}&limit=5`),
  ]);

  if (!profile?.[0] || !quote?.[0]) throw new Error("Ticker not found.");

  const p   = profile[0];
  const q   = quote[0];
  const bs  = balanceSheet?.[0] ?? ({} as FMPBalanceSheet);
  const inc = income ?? [];

  // ── Minimal FX handling ──────────────────────────────────────────────────
  const exchange          = (p.exchangeShortName || p.exchange || "").toUpperCase();
  const priceCurrency     = EXCHANGE_CCY[exchange] || p.currency || "USD";
  // ADR override: FMP may report "USD" for NYSE-listed ADRs, but financials
  // are in the home currency (e.g. TSM balance sheet is TWD).
  let financialsCurrency = ADR_FINANCIALS_CCY[t] || inc[0]?.reportingCurrency || p.currency || "USD";

  const mktCapVal = p.mktCap || q.marketCap || 0;

  // Generic ADR currency inference: FMP sometimes reports "USD" for US-listed
  // ADRs whose financials are in a foreign currency (e.g. TAK → JPY).
  // When the reported currencies match but the company's home country implies
  // otherwise, use a magnitude check to confirm conversion is needed.
  if (financialsCurrency === priceCurrency && !ADR_FINANCIALS_CCY[t] && p.country) {
    const impliedCcy = COUNTRY_CCY[p.country];
    if (impliedCcy && impliedCcy !== priceCurrency) {
      const rawDebt = bs.totalDebt || bs.longTermDebt || 0;
      const rawCash = bs.cashAndShortTermInvestments || bs.cashAndCashEquivalents || 0;
      // Values >50× market cap are impossible in USD — confirms foreign currency.
      if (mktCapVal > 0 && (rawDebt > mktCapVal * 50 || rawCash > mktCapVal * 50)) {
        financialsCurrency = impliedCcy;
      }
    }
  }

  let fxRate = 1;
  if (priceCurrency !== financialsCurrency) {
    const fxKey = `${financialsCurrency}${priceCurrency}`;
    const fallback = FALLBACK_FX[fxKey];
    if (fallback) fxRate = fallback;
  }

  // ── Core fields ──────────────────────────────────────────────────────────
  const sharesOut    = q.sharesOutstanding || inc[0]?.weightedAverageShsOut || 1;
  const totalDebt    = (bs.totalDebt || bs.longTermDebt || 0) * fxRate;
  const totalCash    = (bs.cashAndShortTermInvestments || bs.cashAndCashEquivalents || 0) * fxRate;

  const price        = q.price || p.price || 0;
  const adrShares    = deriveShares(t, mktCapVal, price, sharesOut);
  const rawNetIncome = inc[0] ? sanitizedNetIncome(inc[0], sharesOut) : 0;
  const ttmEPS       = adrShares > 0 ? (rawNetIncome * fxRate) / adrShares : 0;

  const latestRevenue  = (inc[0]?.revenue || 0) * fxRate;
  const revenuePerShare = adrShares > 0 ? latestRevenue / adrShares : 0;

  // Forward EPS: simple estimate (no analyst data)
  const forwardEPS = ttmEPS > 0 ? ttmEPS * 1.1 : 0;

  // ── Historical growth — net income CAGR ──────────────────────────────────
  const niHistory = inc.map(y => sanitizedNetIncome(y, sharesOut) * fxRate);
  let avgHistGrowth5yr = 10;
  if (niHistory.length >= 2 && niHistory[0] > 0) {
    const maxIdx = Math.min(niHistory.length - 1, 4);
    const begin  = niHistory[maxIdx];
    const end    = niHistory[0];
    if (begin > 0) {
      avgHistGrowth5yr = (Math.pow(end / begin, 1 / maxIdx) - 1) * 100;
    } else {
      const absBegin = Math.abs(begin) || 0.01;
      avgHistGrowth5yr = ((end - begin) / (absBegin * maxIdx)) * 100;
    }
  }

  // Analyst growth fallback
  const analystGrowth = avgHistGrowth5yr * 0.8;

  // Inception growth — revenue CAGR
  let inceptionGrowth = 30;
  if (inc.length >= 3) {
    const oldest = inc[inc.length - 1]?.revenue;
    const newest = inc[0]?.revenue;
    if (oldest != null && oldest > 0 && newest != null && newest > 0) {
      inceptionGrowth = (Math.pow(newest / oldest, 1 / (inc.length - 1)) - 1) * 100;
    }
  }

  // Target margin & breakeven
  const netIncome    = rawNetIncome * fxRate;
  const netMargin    = latestRevenue > 0 ? (netIncome / latestRevenue) * 100 : 0;
  const targetMargin = netMargin > 0 ? Math.min(netMargin * 1.2, 40) : 15;
  const breakEvenYear = netIncome > 0 ? 0 : 2;

  // Dividend yield — simple from quote
  const normYield = (raw: number | null | undefined): number => {
    if (!raw || raw <= 0 || raw > 25) return 0;
    return raw < 1 ? raw * 100 : raw;
  };
  const dividendYield = normYield(q.dividendYield);

  // Operating margin (percentage)
  const operatingIncome = (inc[0]?.operatingIncome || 0) * fxRate;
  const operatingMargin = latestRevenue > 0 ? (operatingIncome / latestRevenue) * 100 : null;

  // Lifecycle stage (multi-factor — Damodaran framework)
  const lifecycleStage = classifyLifecycle({
    revenueHistory: inc.map(y => (y.revenue || 0) * fxRate),
    netIncome: rawNetIncome * fxRate,
    operatingIncome,
    dividendYield,
  });

  return {
    marketCap: mktCapVal,
    sector: p.sector || "",
    exchange,
    debt: totalDebt,
    cash: totalCash,
    shares: adrShares,
    ttmEPS,
    forwardEPS: parseFloat(forwardEPS.toFixed(2)),
    historicalGrowth5yr: parseFloat(avgHistGrowth5yr.toFixed(2)),
    analystGrowth: parseFloat(analystGrowth.toFixed(2)),
    fwdGrowthY1: parseFloat(analystGrowth.toFixed(2)),
    fwdGrowthY2: null,
    fwdCAGR: null,
    revenuePerShare: parseFloat(revenuePerShare.toFixed(2)),
    targetMargin: parseFloat(targetMargin.toFixed(1)),
    inceptionGrowth: parseFloat(inceptionGrowth.toFixed(2)),
    breakEvenYear,
    currentPrice: q.price || p.price || 0,
    sma200: q.priceAvg200 || 0,
    dividendYield: parseFloat(dividendYield.toFixed(2)),
    operatingMargin: operatingMargin != null ? parseFloat(operatingMargin.toFixed(1)) : null,
    lifecycleStage,
  };
}

// ─── Main data fetch ──────────────────────────────────────────────────────────

/**
 * Fetches all FMP endpoints in parallel and derives every calculator field.
 */
export async function lookupTicker(
  ticker: string,
  log: (msg: string) => void,
): Promise<TickerData> {
  const t = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9$.-]{1,10}$/.test(t)) {
    throw new Error("Invalid ticker symbol. Use letters, numbers, $, ., or - only (max 10 characters).");
  }

  log(`Fetching data for ${t} from FMP endpoints...`);

  const [profile, quote, balanceSheet, income, estimates, divHistory, dcfData, earningsSurprises, cashFlows, histData] = await Promise.all([
    // 1) Company Profile
    fetchFMP<FMPProfile[]>(`profile?symbol=${t}`).then(d => { log("  ✓ /profile — company info, market cap"); return d; }),

    // 2) Real-time Quote
    fetchFMP<FMPQuote[]>(`quote?symbol=${t}`).then(d => { log("  ✓ /quote — price, TTM EPS, shares, 200-SMA, dividendYield"); return d; }),

    // 3) Balance Sheet (2 years)
    fetchFMP<FMPBalanceSheet[]>(`balance-sheet-statement?symbol=${t}&limit=2`).then(d => { log("  ✓ /balance-sheet-statement — debt, cash (2 yrs)"); return d; }),

    // 4) Income Statement (12 years — need 11 data points for true 10-year CAGR)
    fetchFMP<FMPIncomeStatement[]>(`income-statement?symbol=${t}&limit=12`).then(d => { log("  ✓ /income-statement — revenue, net income (12 yrs)"); return d; }),

    // 5) Analyst Estimates
    fetchFMP<FMPEstimate[]>(`analyst-estimates?symbol=${t}&period=annual&limit=5`)
      .then(d => { log("  ✓ /analyst-estimates — forward EPS & revenue est."); return d; })
      .catch(() => { log("  ⚠ /analyst-estimates — not available (free plan)"); return [] as FMPEstimate[]; }),

    // 6) Dividend history
    fetchFMP<FMPDividend[] | FMPDividendHistory>(`dividends?symbol=${t}&limit=8`)
      .then(d => { log("  ✓ /dividends — dividend history for forward yield"); return d; })
      .catch(() => { log("  ⚠ /dividends — not available"); return [] as FMPDividend[]; }),

    // 6) Discounted Cash Flow
    fetchFMP<FMPDCF[]>(`discounted-cash-flow?symbol=${t}`)
      .then(d => { log("  ✓ /discounted-cash-flow — DCF intrinsic value"); return d; })
      .catch(() => { log("  ⚠ /discounted-cash-flow — not available"); return [] as FMPDCF[]; }),

    // 7) Earnings Surprises
    fetchFMP<FMPEarningSurprise[]>(`earnings-surprises?symbol=${t}`)
      .then(d => { log("  ✓ /earnings-surprises — analyst beat/miss history"); return d; })
      .catch(() => { log("  ⚠ /earnings-surprises — not available"); return [] as FMPEarningSurprise[]; }),

    // 8) Cash Flow Statement (12 years — matches income statement window)
    fetchFMP<FMPCashFlow[]>(`cash-flow-statement?symbol=${t}&limit=12`)
      .then(d => { log("  ✓ /cash-flow-statement — operating/investing/financing flows"); return d; })
      .catch(() => { log("  ⚠ /cash-flow-statement — not available"); return [] as FMPCashFlow[]; }),

    // 9) Historical price (monthly-sampled, last 5 years)
    fetch(`/api/historical-price?symbol=${t}`)
      .then(r => r.ok ? (r.json() as Promise<{ priceHistory: HistoricalPricePoint[] }>) : { priceHistory: [] as HistoricalPricePoint[] })
      .then(d => { log("  ✓ /historical-price — monthly price history for graph"); return d; })
      .catch(() => { log("  ⚠ /historical-price — not available"); return { priceHistory: [] as HistoricalPricePoint[] }; }),

  ]);

  if (!profile?.[0] || !quote?.[0]) throw new Error("Ticker not found or API limit reached.");

  const p   = profile[0];
  const q   = quote[0];
  const bs  = balanceSheet?.[0] ?? ({} as FMPBalanceSheet);
  const inc = income ?? [];

  // ── Currency normalisation ────────────────────────────────────────────────
  const exchange        = (p.exchangeShortName || p.exchange || "").toUpperCase();
  const priceCurrency   = EXCHANGE_CCY[exchange] || p.currency || "USD";
  // ADR override: FMP may report "USD" for NYSE-listed ADRs, but financials
  // are in the home currency (e.g. TSM balance sheet is TWD).
  let financialsCurrency = ADR_FINANCIALS_CCY[t] || inc[0]?.reportingCurrency || p.currency || "USD";

  const mktCapVal = p.mktCap || q.marketCap || 0;

  // Generic ADR currency inference: FMP sometimes reports "USD" for US-listed
  // ADRs whose financials are in a foreign currency (e.g. TAK → JPY).
  // When the reported currencies match but the company's home country implies
  // otherwise, use a magnitude check to confirm conversion is needed.
  if (financialsCurrency === priceCurrency && !ADR_FINANCIALS_CCY[t] && p.country) {
    const impliedCcy = COUNTRY_CCY[p.country];
    if (impliedCcy && impliedCcy !== priceCurrency) {
      const rawDebt = bs.totalDebt || bs.longTermDebt || 0;
      const rawCash = bs.cashAndShortTermInvestments || bs.cashAndCashEquivalents || 0;
      // Values >50× market cap are impossible in USD — confirms foreign currency.
      if (mktCapVal > 0 && (rawDebt > mktCapVal * 50 || rawCash > mktCapVal * 50)) {
        log(`  ⚠ Country-implied currency override: FMP reported "${priceCurrency}" but ${p.country} → "${impliedCcy}" (debt=${rawDebt.toExponential(2)}, mktCap=${mktCapVal.toExponential(2)})`);
        financialsCurrency = impliedCcy;
      }
    }
  }

  if (import.meta.env.DEV) console.log(`[TUP FX] ticker=${t} exchange=${exchange} priceCurrency=${priceCurrency} financialsCurrency=${financialsCurrency}`);

  let fxRate = 1;
  let isConverted = false;
  let currencyNote = "";

  if (priceCurrency !== financialsCurrency) {
    const fxSymbol = `${financialsCurrency}${priceCurrency}`;
    try {
      let fxData = await fetchFMP<Array<{ price?: number; bid?: number; ask?: number }>>(`fx?symbol=${fxSymbol}`).catch(() => []);
      let rate   = fxData?.[0]?.price ?? fxData?.[0]?.bid ?? fxData?.[0]?.ask;
      if (!(rate != null && rate > 0)) {
        log(`  … /fx returned no rate, trying /quote/${fxSymbol}`);
        fxData = await fetchFMP<Array<{ price?: number; bid?: number }>>(`quote/${fxSymbol}`).catch(() => []);
        rate   = fxData?.[0]?.price ?? fxData?.[0]?.bid;
      }
      if (!(rate != null && rate > 0) && FALLBACK_FX[fxSymbol]) {
        rate = FALLBACK_FX[fxSymbol];
        log(`  ⚠ FX API returned no rate — using hardcoded ${fxSymbol} fallback: ${rate}`);
      }
      if (import.meta.env.DEV) console.log(`[TUP FX] ${fxSymbol} rate=${rate} raw=`, fxData?.[0]);
      if (rate != null && rate > 0) {
        fxRate       = rate;
        isConverted  = true;
        currencyNote = `${financialsCurrency} → ${priceCurrency} @ ${rate.toFixed(4)}`;
        log(`  ✓ FX ${fxSymbol}: ${rate.toFixed(6)} — financials converted to ${priceCurrency}`);
      } else {
        log(`  ⚠ FX rate unavailable for ${fxSymbol} — proceeding with unconverted values`);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error(`[TUP FX] fetch error for ${fxSymbol}:`, e);
      const fallbackRate = FALLBACK_FX[`${financialsCurrency}${priceCurrency}`];
      if (fallbackRate) {
        fxRate       = fallbackRate;
        isConverted  = true;
        currencyNote = `${financialsCurrency} → ${priceCurrency} @ ${fallbackRate.toFixed(4)} (hardcoded)`;
        log(`  ⚠ FX fetch failed — applied hardcoded ${financialsCurrency}${priceCurrency}: ${fallbackRate}`);
      } else {
        log(`  ⚠ FX fetch failed — proceeding with unconverted values`);
      }
    }
  }

  // ── Debt & Cash ───────────────────────────────────────────────────────────
  const sharesOut  = q.sharesOutstanding || inc[0]?.weightedAverageShsOut || 1;
  let totalDebt    = (bs.totalDebt || bs.longTermDebt || 0) * fxRate;
  let totalCash    = (bs.cashAndShortTermInvestments || bs.cashAndCashEquivalents || 0) * fxRate;

  // Sanity check: debt >5× market cap for a profitable company → likely unconverted
  let currencyMismatchWarning = "";
  if (mktCapVal > 0 && totalDebt > mktCapVal * 5 && (inc[0]?.netIncome || 0) > 0 && fxRate === 1 && priceCurrency !== financialsCurrency) {
    const fxKey    = `${financialsCurrency}${priceCurrency}`;
    const emergency = FALLBACK_FX[fxKey] || 0;
    if (emergency > 0) {
      const prevDebt = totalDebt;
      totalDebt    = totalDebt * emergency;
      totalCash    = totalCash * emergency;
      fxRate       = emergency;
      isConverted  = true;
      currencyNote = `${financialsCurrency} → ${priceCurrency} @ ${emergency.toFixed(4)} (emergency fallback)`;
      currencyMismatchWarning = `Currency Mismatch — Debt was ${fB(prevDebt)} (${financialsCurrency} unconverted). Emergency ${fxKey} rate ${emergency} applied.`;
      log(`  ⚠ ${currencyMismatchWarning}`);
    } else {
      currencyMismatchWarning = `Currency Mismatch Suspected — Debt (${fB(totalDebt)}) is ${(totalDebt / mktCapVal).toFixed(0)}× Market Cap. Manual check advised.`;
      log(`  ⚠ ${currencyMismatchWarning}`);
    }
  }

  // ── ADR adjustment + Basic Earnings EPS ──────────────────────────────────
  // Derive TTM EPS from netIncome / shares (Basic Earnings), not quote.eps.
  // This reflects the company's actual profitability per share.
  const adrRatio     = ADR_RATIO_TABLE[t] || 1;
  const epsScale     = ADR_EPS_RATIO[t] ?? adrRatio;
  const price        = q.price || p.price || 0;
  const adrShares    = deriveShares(t, mktCapVal, price, sharesOut, log);
  const rawNetIncome = inc[0] ? sanitizedNetIncome(inc[0], sharesOut) : 0;
  const ttmEPS       = adrShares > 0 ? (rawNetIncome * fxRate) / adrShares : 0;

  if (import.meta.env.DEV) console.log(
    `[TUP EPS] ${t} | netIncome=${rawNetIncome} sharesOut=${sharesOut} adrShares=${adrShares.toFixed(0)}` +
    ` | netIncome_${priceCurrency}=${(rawNetIncome * fxRate).toFixed(0)}` +
    ` | ÷adrShares → finalEPS=${ttmEPS.toFixed(4)} ${priceCurrency}`
  );

  // ── Analyst estimates ─────────────────────────────────────────────────────
  const today     = new Date();
  const sortedEst = [...(estimates || [])].sort((a, b) => new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime());
  const futureEst = sortedEst.filter(e => new Date(e.date ?? "").getTime() >  today.getTime());
  const estFwd    = futureEst[0]    ?? null;   // EPS_T   (current fiscal year)
  const estFwd2   = futureEst[1]    ?? null;   // EPS_T+1 (next fiscal year)
  const estFwd3   = futureEst[2]    ?? null;   // EPS_T+2 (year after next)

  // Normalize analyst EPS estimates to the current share count so dilution
  // doesn't skew the blended yield.  epsOf returns per-share in price currency.
  const epsOf = (e: FMPEstimate | null): number => ((e?.epsAvg || 0) * epsScale) * fxRate;
  const epsOfBear = (e: FMPEstimate | null): number => ((e?.epsLow || 0) * epsScale) * fxRate;
  const epsOfBull = (e: FMPEstimate | null): number => ((e?.epsHigh || 0) * epsScale) * fxRate;

  // Forward EPS: analyst consensus, normalized to current shares.
  const forwardEPS    = (estFwd ? epsOf(estFwd) : 0) || (ttmEPS > 0 ? ttmEPS * 1.1 : 0);
  const latestRevenue = (inc[0]?.revenue || 0) * fxRate;
  const revenuePerShare = adrShares > 0 ? latestRevenue / adrShares : 0;

  // ── Historical EPS growth — per-share basis (net income ÷ shares) ────────
  // Uses diluted EPS per year so buyback-driven growth is captured, matching
  // the methodology: "Derived from diluted EPS on the income statement."
  // sanitizedNetIncome cross-checks against epsDiluted to guard against
  // corrupted netIncome values from FMP.
  const epsHistory = inc.map(y => {
    const ni = sanitizedNetIncome(y, sharesOut) * fxRate;
    const sh = y.weightedAverageShsOutDil || y.weightedAverageShsOut || sharesOut;
    return sh > 0 ? ni / sh : 0;
  });

  if (import.meta.env.DEV) {
    console.log(`[TUP HIST] ${t} | epsHistory.length=${epsHistory.length}`,
      epsHistory.map((eps, i) => `${inc[i]?.calendarYear ?? `Y${i}`}: ${eps.toFixed(4)}`));
  }

  const epsGrowthRates: number[] = [];
  const epsGrowthHistory: EpsGrowthPoint[] = [];
  for (let i = 0; i < epsHistory.length - 1; i++) {
    const cur = epsHistory[i], prev = epsHistory[i + 1];
    if (prev !== 0) {
      const gr = (cur - prev) / Math.abs(prev);
      if (isFinite(gr)) {
        const yr = inc[i]?.calendarYear ?? inc[i]?.fiscalYear ?? (inc[i]?.date ? new Date(inc[i].date!).getFullYear() : null);
        epsGrowthHistory.push({ year: yr != null ? String(yr) : `Y${i}`, growth: gr });
        // Winsorize: clamp each YoY rate to ±100% so extreme years contribute
        // directional drag without dominating the average
        epsGrowthRates.push(Math.max(-1, Math.min(1, gr)));
      }
    }
  }
  const sortedGrVals = [...epsGrowthRates].sort((a, b) => a - b);
  const grMid    = Math.floor(sortedGrVals.length / 2);
  const grMedian = sortedGrVals.length === 0 ? null
    : sortedGrVals.length % 2 !== 0
      ? sortedGrVals[grMid]
      : (sortedGrVals[grMid - 1] + sortedGrVals[grMid]) / 2;
  const fallbackHistGrowth = grMedian != null ? grMedian * 100 : 10;

  // ── CAGR helper — endpoint CAGR (positive-to-positive only) ──────────
  // Formula: (EPS_end / EPS_start)^(1/n) - 1
  // Returns null when either endpoint is ≤ 0 (CAGR is undefined).
  const growthCAGR = (end: number, begin: number, n: number): number | null => {
    if (n <= 0 || end <= 0 || begin <= 0) return null;
    return (Math.pow(end / begin, 1 / n) - 1) * 100;
  };

  // ── Anchored CAGR — shifts the start year when the full-window CAGR is
  // extreme (|rate| > 100%) due to a near-zero or negative anchor EPS.
  // Walks inward from the oldest year toward the most recent, looking for
  // the nearest positive-EPS anchor that yields |CAGR| ≤ 100%.
  // Requires at least 2 compounding periods to be meaningful.
  const CAGR_CAP = 100; // % — beyond this, the anchor is likely a low-base outlier
  const anchoredCAGR = (targetIdx: number): { rate: number; span: number } | null => {
    const end = epsHistory[0];
    if (end <= 0) return null;
    // Try the full window first
    const fullRate = growthCAGR(end, epsHistory[targetIdx], targetIdx);
    if (fullRate !== null && Math.abs(fullRate) <= CAGR_CAP) {
      return { rate: fullRate, span: targetIdx };
    }
    // Walk inward: try progressively shorter windows (min 2 periods)
    for (let i = targetIdx - 1; i >= 2; i--) {
      const rate = growthCAGR(end, epsHistory[i], i);
      if (rate !== null && Math.abs(rate) <= CAGR_CAP) {
        return { rate, span: i };
      }
    }
    return null;
  };

  // ── Winsorized median YoY EPS growth — final fallback ─────────────────
  // When endpoint CAGR is undefined (negative/zero endpoints) or no anchor
  // shift produces a reasonable rate, fall back to the median of YoY growth
  // rates winsorized to ±100%. Extreme years (turnarounds, collapses) still
  // contribute directional drag without dominating the result.
  const winsorizedMedianGrowth = (maxIdx: number): number => {
    const rates: number[] = [];
    for (let i = 0; i < maxIdx && i < epsHistory.length - 1; i++) {
      const cur = epsHistory[i], prev = epsHistory[i + 1];
      if (prev !== 0) {
        const gr = (cur - prev) / Math.abs(prev);
        if (isFinite(gr)) {
          rates.push(Math.max(-1, Math.min(1, gr)));
        }
      }
    }
    if (rates.length === 0) return fallbackHistGrowth;
    rates.sort((a, b) => a - b);
    const mid = Math.floor(rates.length / 2);
    return (rates.length % 2 !== 0 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2) * 100;
  };

  // ── 10-year EPS CAGR ─────────────────────────────────────────────────
  // Cascade: endpoint CAGR (full window) → shifted-anchor CAGR → winsorized median
  let avgHistGrowth = fallbackHistGrowth;
  const maxIdx10 = epsHistory.length - 1;  // use full available span
  if (maxIdx10 >= 1) {
    const anchored = anchoredCAGR(maxIdx10);
    if (anchored) {
      avgHistGrowth = anchored.rate;
    } else {
      avgHistGrowth = winsorizedMedianGrowth(maxIdx10);
    }
  }

  // ── 5-year EPS CAGR — index 5 = 6 data points = 5 compounding periods ──
  let avgHistGrowth5yr = avgHistGrowth;  // fallback to 10yr if not enough data
  const maxIdx5 = Math.min(epsHistory.length - 1, 5);
  if (maxIdx5 >= 1 && maxIdx5 !== maxIdx10) {
    const anchored = anchoredCAGR(maxIdx5);
    if (anchored) {
      avgHistGrowth5yr = anchored.rate;
    } else {
      avgHistGrowth5yr = winsorizedMedianGrowth(maxIdx5);
    }
  }

  if (import.meta.env.DEV) {
    const anch10 = anchoredCAGR(maxIdx10);
    const anch5  = anchoredCAGR(maxIdx5);
    console.log(`[TUP CAGR] ${t} | maxIdx10=${maxIdx10} maxIdx5=${maxIdx5} | 10yr=${avgHistGrowth.toFixed(2)}%${anch10 && anch10.span < maxIdx10 ? ` (shifted→${anch10.span}yr)` : anch10 ? '' : ' (winsorized median)'} 5yr=${avgHistGrowth5yr.toFixed(2)}%${anch5 && anch5.span < maxIdx5 ? ` (shifted→${anch5.span}yr)` : anch5 ? '' : ' (winsorized median)'}`);
  }

  // ── Forward growth — estimate-to-estimate ratios ────────────────────────
  // Framework:
  //   EPS_T   = estFwd  (current fiscal year estimate)
  //   EPS_T+1 = estFwd2 (next fiscal year estimate)
  //   EPS_T+2 = estFwd3 (year after next estimate)
  //   G1 = (EPS_T+1 - EPS_T) / EPS_T
  //   G2 = (EPS_T+2 - EPS_T+1) / EPS_T+1
  //   analystGrowth = G1  (used in TUP blend: (G_hist + G1) / 2)
  const epsT         = epsOf(estFwd);     // EPS_T   (current year)
  const epsTp1       = epsOf(estFwd2);    // EPS_T+1 (next year)
  const epsTp2       = epsOf(estFwd3);    // EPS_T+2 (year after)

  let analystGrowth  = avgHistGrowth * 0.8;
  if (epsT > 0 && epsTp1 > 0) {
    analystGrowth = ((epsTp1 / epsT) - 1) * 100;           // G1
  } else {
    // Revenue fallback when EPS estimates unavailable
    const estRev  = (estFwd?.revenueAvg  || 0) * fxRate;
    const estRev2 = (estFwd2?.revenueAvg || 0) * fxRate;
    if (estRev2 > 0 && estRev > 0) {
      analystGrowth = ((estRev2 / estRev) - 1) * 100;
    } else if (estRev > 0 && latestRevenue > 0) {
      analystGrowth = ((estRev - latestRevenue) / latestRevenue) * 100;
    }
  }

  // ── Forward growth components for variable rate sequence ─────────────────
  const fwdGrowthY1 = analystGrowth; // G1: (EPS_T+1 / EPS_T) - 1
  let fwdGrowthY2: number | null = null;
  let fwdCAGRValue: number | null = null;

  // G2: (EPS_T+2 / EPS_T+1) - 1
  if (epsTp1 > 0 && epsTp2 > 0) {
    fwdGrowthY2 = ((epsTp2 / epsTp1) - 1) * 100;
  }
  // Terminal CAGR: annualized growth from EPS_T to EPS_T+2 (3-year span)
  if (epsT > 0 && epsTp2 > 0) {
    fwdCAGRValue = (Math.pow(epsTp2 / epsT, 1 / 3) - 1) * 100;
  } else if (epsT > 0 && epsTp1 > 0) {
    // 2-year span fallback
    fwdCAGRValue = (Math.sqrt(epsTp1 / epsT) - 1) * 100;
  }

  // ── Bear / Bull forward growth scenarios ────────────────────────────────
  // Use base-case EPS_T (epsAvg) as denominator for all scenarios so that
  // bear < base < bull is always maintained. Only future estimates vary.
  let fwdGrowthY1Bear: number | null = null;
  let fwdGrowthY2Bear: number | null = null;
  let fwdCAGRBear: number | null = null;
  let fwdGrowthY1Bull: number | null = null;
  let fwdGrowthY2Bull: number | null = null;
  let fwdCAGRBull: number | null = null;

  const epsTp1Bear  = epsOfBear(estFwd2);
  const epsTp2Bear  = epsOfBear(estFwd3);
  const epsTp1Bull  = epsOfBull(estFwd2);
  const epsTp2Bull  = epsOfBull(estFwd3);

  if (epsT > 0) {
    // Bear: G1 = (epsLow_T+1 / epsAvg_T) - 1
    if (epsTp1Bear > 0) fwdGrowthY1Bear = ((epsTp1Bear / epsT) - 1) * 100;
    if (epsTp1Bear > 0 && epsTp2Bear > 0) fwdGrowthY2Bear = ((epsTp2Bear / epsTp1Bear) - 1) * 100;
    if (epsTp2Bear > 0) fwdCAGRBear = (Math.pow(epsTp2Bear / epsT, 1 / 3) - 1) * 100;
    else if (epsTp1Bear > 0) fwdCAGRBear = (Math.sqrt(epsTp1Bear / epsT) - 1) * 100;

    // Bull: G1 = (epsHigh_T+1 / epsAvg_T) - 1
    if (epsTp1Bull > 0) fwdGrowthY1Bull = ((epsTp1Bull / epsT) - 1) * 100;
    if (epsTp1Bull > 0 && epsTp2Bull > 0) fwdGrowthY2Bull = ((epsTp2Bull / epsTp1Bull) - 1) * 100;
    if (epsTp2Bull > 0) fwdCAGRBull = (Math.pow(epsTp2Bull / epsT, 1 / 3) - 1) * 100;
    else if (epsTp1Bull > 0) fwdCAGRBull = (Math.sqrt(epsTp1Bull / epsT) - 1) * 100;
  }

  // ── Inception growth — revenue CAGR across all available years ───────────
  let inceptionGrowth = 30;
  if (inc.length >= 3) {
    const oldest = inc[inc.length - 1]?.revenue;
    const newest = inc[0]?.revenue;
    if (oldest != null && oldest > 0 && newest != null && newest > 0) {
      inceptionGrowth = (Math.pow(newest / oldest, 1 / (inc.length - 1)) - 1) * 100;
    }
  }

  // ── Forward Dividend Yield — 4-tier waterfall ─────────────────────────────
  const normYield = (raw: number | null | undefined): number => {
    if (!raw || raw <= 0 || raw > 25) return 0;
    return raw < 1 ? raw * 100 : raw;
  };

  const FREQ_MAP: Record<string, number> = {
    quarterly: 4, "semi-annual": 2, semiannual: 2, "bi-annual": 2, biannual: 2,
    monthly: 12, annual: 1, yearly: 1,
  };

  const inferFreq = (records: FMPDividend[]): number => {
    if (records.length < 2) return 4;
    const dates = records.slice(0, 4).map(d => new Date(d.date ?? "").getTime()).sort((a, b) => b - a);
    const gaps: number[] = [];
    for (let i = 0; i < dates.length - 1; i++) gaps.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avgGap < 45)  return 12;
    if (avgGap < 110) return 4;
    if (avgGap < 200) return 2;
    return 1;
  };

  let dividendYield = 0;
  let divNote       = "";
  const livePrice   = q.price || p.price || 0;

  // Tier 1: dividends endpoint — require recurring pattern, filter special dividends
  const divRecs: FMPDividend[] = Array.isArray(divHistory)
    ? divHistory
    : ((divHistory as FMPDividendHistory)?.historical || []);
  if (divRecs.length >= 2 && livePrice > 0) {
    const amounts = divRecs.map(d => d.adjDividend || d.dividend || 0).filter(a => a > 0);
    if (amounts.length >= 2) {
      const latest = amounts[0];
      // Median of all records to detect outlier special dividends
      const sorted = [...amounts].sort((a, b) => a - b);
      const mid    = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      // If latest is >3× median, it's likely a special dividend — use median instead
      const adjDiv = latest > median * 3 ? median : latest;
      const freqStr    = (divRecs[0].frequency || "").toLowerCase().replace(/[^a-z-]/g, "");
      const multiplier = FREQ_MAP[freqStr] || inferFreq(divRecs);
      dividendYield    = (adjDiv * multiplier / livePrice) * 100;
      const wasSpecial = latest > median * 3;
      divNote          = `adjDiv $${adjDiv.toFixed(4)} × ${multiplier} (${divRecs[0].frequency || `inferred×${multiplier}`}) ÷ $${livePrice.toFixed(2)}${wasSpecial ? " [special div filtered]" : ""}`;
      log(`  ✓ Fwd div yield (dividends): adjDiv=${adjDiv.toFixed(4)} × ${multiplier} / $${livePrice} = ${dividendYield.toFixed(2)}%${wasSpecial ? ` (special $${latest.toFixed(4)} filtered → median $${median.toFixed(4)})` : ""}`);
    }
  } else if (divRecs.length === 1 && livePrice > 0) {
    // Single record — insufficient history to confirm recurring, skip to Tier 2
    log(`  … /dividends — only 1 record, skipping (may be special dividend)`);
  }

  // Tier 2: quote.dividendYield
  if (dividendYield === 0) {
    const y2 = normYield(q.dividendYield);
    if (y2 > 0) {
      dividendYield = y2;
      divNote       = `quote.dividendYield = ${q.dividendYield}`;
      log(`  ✓ Fwd div yield (quote): ${dividendYield.toFixed(2)}%`);
    }
  }

  // Tier 3: manual from profile.lastDiv
  if (dividendYield === 0 && p.lastDiv && p.lastDiv > 0 && livePrice > 0) {
    const freq             = epsScale > 1 ? 2 : 4;
    const lastDivConverted = (p.lastDiv / epsScale) * fxRate;
    dividendYield          = (lastDivConverted * freq) / livePrice * 100;
    divNote                = `lastDiv ${p.lastDiv.toFixed(4)} ÷ ${epsScale} × ${fxRate.toFixed(4)} × ${freq} ÷ $${livePrice.toFixed(2)}`;
    log(`  ✓ Fwd div yield (manual lastDiv): ${dividendYield.toFixed(2)}%`);
  }

  if (dividendYield === 0) log(`  … No dividend data — yield defaulting to 0.00%`);

  // ── Valuation indicators ──────────────────────────────────────────────────
  const blendedGrowth   = fallbackHistGrowth;
  const peterLynchRatio = ttmEPS > 0 && blendedGrowth > 0
    ? ((q.price || p.price || 0) / ttmEPS) / blendedGrowth
    : null;
  const dcfValue        = dcfData?.[0]?.dcf ?? null;

  // Piotroski F-Score
  const bs0 = bs;
  const bs1: FMPBalanceSheet = balanceSheet?.[1] ?? ({} as FMPBalanceSheet);
  let piotroski: number | null = null;
  const ta0 = bs0.totalAssets || 0;
  const ta1  = bs1.totalAssets || 0;
  const inc0 = inc[0] ?? {};
  const inc1 = inc[1] ?? {};
  const cf0  = (Array.isArray(cashFlows) ? cashFlows[0] : null) ?? ({} as FMPCashFlow);
  if (ta0 > 0) {
    let fs = 0;

    // Profitability (4 pts)
    const roa0 = (inc0.netIncome || 0) / ta0;
    const roa1 = ta1 > 0 ? (inc1.netIncome || 0) / ta1 : null;
    const cfo0 = cf0.operatingCashFlow || cf0.netCashProvidedByOperatingActivities || 0;
    if (roa0 > 0)                         fs++;
    if (cfo0 > 0)                         fs++;
    if (roa1 !== null && roa0 > roa1)     fs++;
    if ((cfo0 / ta0) > roa0)              fs++;

    // Leverage / Liquidity (3 pts)
    const ltd0  = bs0.longTermDebt || 0;
    const ltd1  = bs1.longTermDebt || 0;
    const ltdR0 = ta0 > 0 ? ltd0 / ta0 : 0;
    const ltdR1 = ta1 > 0 ? ltd1 / ta1 : null;
    const tcl0  = bs0.totalCurrentLiabilities || 0;
    const tcl1  = bs1.totalCurrentLiabilities || 0;
    const tca0  = bs0.totalCurrentAssets || 0;
    const tca1  = bs1.totalCurrentAssets || 0;
    const cr0   = tcl0 > 0 ? tca0 / tcl0 : 0;
    const cr1   = tcl1 > 0 ? tca1 / tcl1 : null;
    const sh0   = inc0.weightedAverageShsOut || inc0.weightedAverageShsOutDil || sharesOut;
    const sh1   = inc1.weightedAverageShsOut || inc1.weightedAverageShsOutDil || 0;
    if (ltdR1 !== null && ltdR0 < ltdR1)  fs++;
    if (cr1 !== null && cr0 > cr1)        fs++;
    if (sh1 > 0 && sh0 <= sh1 * 1.02)    fs++;

    // Operating Efficiency (2 pts)
    const gm0 = (inc0.revenue || 0) > 0 ? (inc0.grossProfit || 0) / (inc0.revenue as number) : 0;
    const gm1 = (inc1.revenue || 0) > 0 ? (inc1.grossProfit || 0) / (inc1.revenue as number) : null;
    const at0 = ta0 > 0 ? (inc0.revenue || 0) / ta0 : 0;
    const at1 = ta1 > 0 ? (inc1.revenue || 0) / ta1 : null;
    if (gm1 !== null && gm0 > gm1)        fs++;
    if (at1 !== null && at0 > at1)        fs++;

    piotroski = fs;
  }

  // ── Derived financial ratios (used by GuruRadar) ──────────────────────────
  const equity_raw = bs0.totalStockholdersEquity || 0;
  const equity_fx  = equity_raw * fxRate;
  const beta_val: number | null = p.beta ?? null;
  const tcl0_r = bs0.totalCurrentLiabilities || 0;
  const tca0_r = bs0.totalCurrentAssets || 0;
  const currentRatio: number | null = tcl0_r > 0 ? tca0_r / tcl0_r : null;
  const debtToEquity: number | null = equity_fx > 0 ? totalDebt / equity_fx : null;
  const netIncomeForRatios = (inc[0] ? sanitizedNetIncome(inc[0], sharesOut) : 0) * fxRate;
  const returnOnEquity: number | null = equity_fx > 0 ? netIncomeForRatios / equity_fx : null;
  const returnOnAssets: number | null = ta0 > 0 ? netIncomeForRatios / (ta0 * fxRate) : null;
  const grossMargin: number | null = latestRevenue > 0 ? ((inc[0]?.grossProfit || 0) * fxRate) / latestRevenue : null;
  const profitMargin: number | null = latestRevenue > 0 ? netIncomeForRatios / latestRevenue : null;
  const bookValuePerShare: number | null = adrShares > 0 ? equity_fx / adrShares : null;
  const peRatio: number | null = ttmEPS > 0 ? price / ttmEPS : null;
  const pbRatio: number | null = bookValuePerShare != null && bookValuePerShare > 0 ? price / bookValuePerShare : null;
  const fcf0_val = Array.isArray(cashFlows) ? cashFlows[0] : null;
  const freeCashFlowPerShare: number | null = adrShares > 0 && fcf0_val?.freeCashFlow != null
    ? (fcf0_val.freeCashFlow * fxRate) / adrShares : null;

  // ── Target margin & breakeven ─────────────────────────────────────────────
  const netIncome    = (inc[0] ? sanitizedNetIncome(inc[0], sharesOut) : 0) * fxRate;
  const netMargin    = latestRevenue > 0 ? (netIncome / latestRevenue) * 100 : 0;
  const targetMargin = netMargin > 0 ? Math.min(netMargin * 1.2, 40) : 15;
  const breakEvenYear = netIncome > 0 ? 0 : 2;

  log("");
  log(`✓ ${p.companyName} — ${p.sector} / ${p.industry}`);
  if (isConverted) log(`  ${currencyNote}`);
  log(`  Market Cap: ${fB(p.mktCap || 0)}  |  Debt: ${fB(totalDebt)}  |  Cash: ${fB(totalCash)}`);
  log(`  Shares: ${(adrShares / 1e9).toFixed(3)}B${adrRatio > 1 ? ` (ADR ${adrRatio}:1)` : ""}  |  TTM EPS: $${f(ttmEPS)}  |  Fwd EPS: $${forwardEPS.toFixed(2)}`);
  log(`  Hist Growth: ${avgHistGrowth.toFixed(1)}%  |  Analyst Growth: ${analystGrowth.toFixed(1)}%  |  Fwd Div Yield: ${dividendYield.toFixed(2)}%`);
  log(`  Price: $${q.price}  |  200-SMA: $${q.priceAvg200 || "N/A"}`);

  // ── Operating margin (percentage) ─────────────────────────────────────
  const operatingIncomeVal = (inc[0]?.operatingIncome || 0) * fxRate;
  const operatingMargin = latestRevenue > 0 ? (operatingIncomeVal / latestRevenue) * 100 : null;

  // ── Lifecycle stage (multi-factor — Damodaran framework) ────────────────
  const lifecycleStage = classifyLifecycle({
    revenueHistory: inc.map(y => (y.revenue || 0) * fxRate),
    netIncome: (inc[0] ? sanitizedNetIncome(inc[0], sharesOut) : 0) * fxRate,
    operatingIncome: operatingIncomeVal,
    dividendYield,
  });

  return {
    companyName: p.companyName || t,
    ticker: t,
    sector: p.sector || "",
    industry: p.industry || "",
    marketCap: p.mktCap || q.marketCap || 0,
    debt: totalDebt,
    cash: totalCash,
    shares: adrShares,
    ttmEPS,
    forwardEPS: parseFloat(forwardEPS.toFixed(2)),
    historicalGrowth: parseFloat(avgHistGrowth.toFixed(2)),
    historicalGrowth5yr: parseFloat(avgHistGrowth5yr.toFixed(2)),
    epsYearsShort: maxIdx5,
    epsYearsLong: maxIdx10,
    analystGrowth: parseFloat(analystGrowth.toFixed(2)),
    fwdGrowthY1: parseFloat(fwdGrowthY1.toFixed(2)),
    fwdGrowthY2: fwdGrowthY2 != null ? parseFloat(fwdGrowthY2.toFixed(2)) : null,
    fwdCAGR: fwdCAGRValue != null ? parseFloat(fwdCAGRValue.toFixed(2)) : null,
    fwdGrowthY1Bear: fwdGrowthY1Bear != null ? parseFloat(fwdGrowthY1Bear.toFixed(2)) : null,
    fwdGrowthY2Bear: fwdGrowthY2Bear != null ? parseFloat(fwdGrowthY2Bear.toFixed(2)) : null,
    fwdCAGRBear: fwdCAGRBear != null ? parseFloat(fwdCAGRBear.toFixed(2)) : null,
    fwdGrowthY1Bull: fwdGrowthY1Bull != null ? parseFloat(fwdGrowthY1Bull.toFixed(2)) : null,
    fwdGrowthY2Bull: fwdGrowthY2Bull != null ? parseFloat(fwdGrowthY2Bull.toFixed(2)) : null,
    fwdCAGRBull: fwdCAGRBull != null ? parseFloat(fwdCAGRBull.toFixed(2)) : null,
    revenuePerShare: parseFloat(revenuePerShare.toFixed(2)),
    targetMargin: parseFloat(targetMargin.toFixed(1)),
    inceptionGrowth: parseFloat(inceptionGrowth.toFixed(2)),
    breakEvenYear,
    currentPrice: q.price || p.price || 0,
    sma200: q.priceAvg200 || 0,
    dividendYield: parseFloat(dividendYield.toFixed(2)),
    operatingMargin: operatingMargin != null ? parseFloat(operatingMargin.toFixed(1)) : null,
    lifecycleStage,
    divNote,
    peterLynchRatio: peterLynchRatio != null ? parseFloat(Number(peterLynchRatio).toFixed(2)) : null,
    dcfValue: dcfValue != null ? parseFloat(Number(dcfValue).toFixed(2)) : null,
    piotroski,
    isConverted,
    currencyNote,
    currencyMismatchWarning,
    earningsSurprises: Array.isArray(earningsSurprises) ? earningsSurprises : [],
    cashFlowHistory: Array.isArray(cashFlows) ? cashFlows : [],
    incomeHistory: Array.isArray(income) ? income : [],
    epsGrowthHistory,
    description: p.description || "",
    exchange,
    priceHistory: histData.priceHistory ?? [],
    beta: beta_val,
    currentRatio,
    debtToEquity,
    returnOnEquity,
    returnOnAssets,
    grossMargin,
    profitMargin,
    bookValuePerShare,
    peRatio,
    pbRatio,
    freeCashFlowPerShare,
  };
}
