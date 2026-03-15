import { ADR_RATIO_TABLE, EXCHANGE_CCY, FALLBACK_FX } from "./constants.ts";
import { f, fB } from "./utils.ts";
import type {
  TickerData, LifecycleStage,
  FMPProfile, FMPQuote, FMPBalanceSheet, FMPIncomeStatement,
  FMPEstimate,
  FMPDividend, FMPDividendHistory, FMPDCF,
  FMPEarningSurprise, FMPCashFlow,
} from "./types.ts";

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

// ─── Random stock picker (cached) ─────────────────────────────────────────────

let _cachedCompanies: Array<{ symbol: string; name: string }> | null = null;
const _etfCache: Record<string, Set<string>> = {};

async function getETFHoldings(etf: string): Promise<Set<string>> {
  const key = etf.toUpperCase();
  if (!_etfCache[key]) {
    try {
      const holdings = await fetchFMP<Array<{ asset?: string; symbol?: string }>>(`etf-holder?symbol=${key}`);
      _etfCache[key] = new Set(
        (holdings || []).map(h => (h.asset || h.symbol || "").toUpperCase()).filter(Boolean)
      );
    } catch {
      _etfCache[key] = new Set();
    }
  }
  return _etfCache[key];
}

async function ensureCachedCompanies(): Promise<Array<{ symbol: string; name: string }>> {
  if (!_cachedCompanies) {
    const [list, vti] = await Promise.all([
      fetchFMP<Array<{ symbol: string; name: string; type?: string; exchange?: string }>>("actively-trading-list"),
      getETFHoldings("VTI"),
    ]);
    _cachedCompanies = list.filter(item => {
      if (!item.symbol || !item.name) return false;
      if (!/^[A-Z0-9$.]{1,10}$/.test(item.symbol)) return false;
      if (item.type && item.type.toLowerCase() !== "stock") return false;
      if (item.symbol.includes(".")) return false;
      if (vti.size > 0 && !vti.has(item.symbol.toUpperCase())) return false;
      const lower = item.name.toLowerCase();
      if (lower.includes(" etf") || lower.includes("ishares") || lower.includes("vanguard") ||
          lower.includes("spdr") || lower.includes(" fund") || lower.includes("proshares") ||
          lower.includes("direxion") || lower.includes("wisdomtree") || lower.includes("trust")) return false;
      return true;
    });
  }
  return _cachedCompanies;
}

export async function fetchRandomTicker(): Promise<string> {
  const companies = await ensureCachedCompanies();
  if (companies.length === 0) throw new Error("No actively traded stocks found.");
  return companies[Math.floor(Math.random() * companies.length)].symbol;
}

export async function fetchRandomTickerFiltered(indexEtf: string): Promise<string> {
  const companies = await ensureCachedCompanies();
  const etf = indexEtf || "VTI";
  if (etf.toUpperCase() === "VTI") {
    // Already filtered to VTI during caching
    if (companies.length === 0) throw new Error("No actively traded stocks found.");
    return companies[Math.floor(Math.random() * companies.length)].symbol;
  }
  const holdings = await getETFHoldings(etf);
  const pool = holdings.size > 0
    ? companies.filter(c => holdings.has(c.symbol.toUpperCase()))
    : companies;
  if (pool.length === 0) throw new Error(`No stocks found in ${etf.toUpperCase()}.`);
  return pool[Math.floor(Math.random() * pool.length)].symbol;
}

// ─── Low-level HTTP wrapper ───────────────────────────────────────────────────

export async function fetchFMP<T = unknown>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/fmp/${endpoint}`);
  if (!res.ok) {
    if (import.meta.env.DEV) console.error(`FMP proxy ${res.status}: ${endpoint}`);
    if (res.status === 401) throw new Error("Invalid API key.");
    if (res.status === 429) throw new Error("API rate limit reached. Try again later.");
    throw new Error("Unable to fetch market data. Please try again.");
  }
  return res.json() as T;
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
  const financialsCurrency = inc[0]?.reportingCurrency || p.currency || "USD";

  let fxRate = 1;
  if (priceCurrency !== financialsCurrency) {
    const fxKey = `${financialsCurrency}${priceCurrency}`;
    const fallback = FALLBACK_FX[fxKey];
    if (fallback) fxRate = fallback;
  }

  // ── Core fields ──────────────────────────────────────────────────────────
  const sharesOut    = q.sharesOutstanding || inc[0]?.weightedAverageShsOut || 1;
  const totalDebt    = (bs.totalDebt || bs.longTermDebt || 0) * fxRate;
  const totalCash    = (bs.cashAndCashEquivalents || bs.cashAndShortTermInvestments || 0) * fxRate;
  const mktCapVal    = p.mktCap || q.marketCap || 0;

  const adrRatio     = ADR_RATIO_TABLE[t] || 1;
  const adrShares    = adrRatio > 1 ? sharesOut / adrRatio : sharesOut;
  const rawNetIncome = inc[0]?.netIncome || 0;
  const ttmEPS       = (sharesOut > 0 ? rawNetIncome / sharesOut : 0) / adrRatio * fxRate;

  const latestRevenue  = (inc[0]?.revenue || 0) * fxRate;
  const revenuePerShare = adrShares > 0 ? latestRevenue / adrShares : 0;

  // Forward EPS: simple estimate (no analyst data)
  const forwardEPS = ttmEPS > 0 ? ttmEPS * 1.1 : 0;

  // ── Historical growth — net income CAGR ──────────────────────────────────
  const niHistory = inc.map(y => (y.netIncome || 0) * fxRate);
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

  // Lifecycle stage
  const lcRev0 = inc[0]?.revenue || 0;
  const lcRev1 = inc[1]?.revenue || 0;
  const lcRevGrowth = lcRev1 > 0 ? ((lcRev0 - lcRev1) / lcRev1) * 100 : null;
  const lcIsProfit  = rawNetIncome > 0;
  let lifecycleStage: LifecycleStage | null = null;
  if (lcRevGrowth !== null) {
    if (!lcIsProfit)           lifecycleStage = "startup";
    else if (lcRevGrowth > 30) lifecycleStage = "young_growth";
    else if (lcRevGrowth > 15) lifecycleStage = "high_growth";
    else if (lcRevGrowth > 5)  lifecycleStage = "mature_growth";
    else if (lcRevGrowth >= 0) lifecycleStage = "mature_stable";
    else                       lifecycleStage = "decline";
  }

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
  if (!/^[A-Z0-9$.]{1,10}$/.test(t)) {
    throw new Error("Invalid ticker symbol. Use letters, numbers, $ or . only (max 10 characters).");
  }

  log(`Fetching data for ${t} from FMP endpoints...`);

  const [profile, quote, balanceSheet, income, estimates, divHistory, dcfData, earningsSurprises, cashFlows] = await Promise.all([
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

  ]);

  if (!profile?.[0] || !quote?.[0]) throw new Error("Ticker not found or API limit reached.");

  const p   = profile[0];
  const q   = quote[0];
  const bs  = balanceSheet?.[0] ?? ({} as FMPBalanceSheet);
  const inc = income ?? [];

  // ── Currency normalisation ────────────────────────────────────────────────
  const exchange        = (p.exchangeShortName || p.exchange || "").toUpperCase();
  const priceCurrency   = EXCHANGE_CCY[exchange] || p.currency || "USD";
  const financialsCurrency = inc[0]?.reportingCurrency || p.currency || "USD";

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
  let totalCash    = (bs.cashAndCashEquivalents || bs.cashAndShortTermInvestments || 0) * fxRate;

  // Sanity check: debt >5× market cap for a profitable company → likely unconverted
  const mktCapVal = p.mktCap || q.marketCap || 0;
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
  const adrShares    = adrRatio > 1 ? sharesOut / adrRatio : sharesOut;
  const rawNetIncome = (inc[0]?.netIncome || 0);
  const rawTTMEPS    = sharesOut > 0 ? rawNetIncome / sharesOut : 0;
  const ttmEPS       = (rawTTMEPS / adrRatio) * fxRate;

  if (import.meta.env.DEV) console.log(
    `[TUP EPS] ${t} | netIncome=${rawNetIncome} shares=${sharesOut} adrShares=${adrShares}` +
    ` | rawEPS=${rawTTMEPS.toFixed(4)} ${financialsCurrency}` +
    ` | ÷${adrRatio} ×${fxRate.toFixed(6)} → finalEPS=${ttmEPS.toFixed(4)} ${priceCurrency}`
  );

  // ── Analyst estimates ─────────────────────────────────────────────────────
  const today     = new Date();
  const sortedEst = [...(estimates || [])].sort((a, b) => new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime());
  const pastEst   = sortedEst.filter(e => new Date(e.date ?? "").getTime() <= today.getTime());
  const futureEst = sortedEst.filter(e => new Date(e.date ?? "").getTime() >  today.getTime());
  const estTTM    = pastEst[pastEst.length - 1] ?? null;
  const estFwd    = futureEst[0]    ?? null;   // EPS_T   (current fiscal year)
  const estFwd2   = futureEst[1]    ?? null;   // EPS_T+1 (next fiscal year)
  const estFwd3   = futureEst[2]    ?? null;   // EPS_T+2 (year after next)

  // Normalize analyst EPS estimates to the current share count so dilution
  // doesn't skew the blended yield.  epsOf returns per-share in price currency.
  const epsOf = (e: FMPEstimate | null): number => ((e?.epsAvg || 0) / adrRatio) * fxRate;
  const epsOfBear = (e: FMPEstimate | null): number => ((e?.epsLow || 0) / adrRatio) * fxRate;
  const epsOfBull = (e: FMPEstimate | null): number => ((e?.epsHigh || 0) / adrRatio) * fxRate;

  // Forward EPS: analyst consensus, normalized to current shares.
  const forwardEPS    = (estFwd ? epsOf(estFwd) : 0) || (ttmEPS > 0 ? ttmEPS * 1.1 : 0);
  const latestRevenue = (inc[0]?.revenue || 0) * fxRate;
  const revenuePerShare = adrShares > 0 ? latestRevenue / adrShares : 0;

  // ── Historical EPS growth — per-share basis (net income ÷ shares) ────────
  // Uses diluted EPS per year so buyback-driven growth is captured, matching
  // the methodology: "Derived from diluted EPS on the income statement."
  const epsHistory = inc.map(y => {
    const ni = (y.netIncome || 0) * fxRate;
    const sh = y.weightedAverageShsOutDil || y.weightedAverageShsOut || sharesOut;
    return sh > 0 ? ni / sh : 0;
  });

  if (import.meta.env.DEV) {
    console.log(`[TUP HIST] ${t} | epsHistory.length=${epsHistory.length}`,
      epsHistory.map((eps, i) => `${inc[i]?.calendarYear ?? `Y${i}`}: ${eps.toFixed(4)}`));
  }

  const epsGrowthRates: number[] = [];
  for (let i = 0; i < epsHistory.length - 1; i++) {
    const cur = epsHistory[i], prev = epsHistory[i + 1];
    if (prev > 0 && cur > 0) {
      const gr = (cur - prev) / prev;
      if (isFinite(gr) && Math.abs(gr) < 10) epsGrowthRates.push(gr);
    }
  }
  const sortedGrVals = [...epsGrowthRates].sort((a, b) => a - b);
  const grMid    = Math.floor(sortedGrVals.length / 2);
  const grMedian = sortedGrVals.length === 0 ? null
    : sortedGrVals.length % 2 !== 0
      ? sortedGrVals[grMid]
      : (sortedGrVals[grMid - 1] + sortedGrVals[grMid]) / 2;
  const fallbackHistGrowth = grMedian != null ? grMedian * 100 : 10;

  // ── CAGR helper — standard CAGR (positive-to-positive only) ──────────
  const growthCAGR = (end: number, begin: number, n: number): number | null => {
    if (n <= 0 || end <= 0 || begin <= 0) return null;
    return (Math.pow(end / begin, 1 / n) - 1) * 100;
  };

  // ── Window-specific median YoY EPS growth — for turnaround fallback ────
  // When starting EPS is negative, CAGR is meaningless. Use the median of
  // profitable year-over-year growth rates within the window instead.
  const windowMedianGrowth = (maxIdx: number): number => {
    const rates: number[] = [];
    for (let i = 0; i < maxIdx && i < epsHistory.length - 1; i++) {
      const cur = epsHistory[i], prev = epsHistory[i + 1];
      if (prev > 0 && cur > 0) {
        const gr = (cur - prev) / prev;
        if (isFinite(gr) && Math.abs(gr) < 10) rates.push(gr);
      }
    }
    if (rates.length === 0) return fallbackHistGrowth;
    rates.sort((a, b) => a - b);
    const mid = Math.floor(rates.length / 2);
    return (rates.length % 2 !== 0 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2) * 100;
  };

  // ── 10-year EPS CAGR ─────────────────────────────────────────────────
  let avgHistGrowth = fallbackHistGrowth;
  const maxIdx10 = epsHistory.length - 1;  // use full available span
  if (maxIdx10 >= 1) {
    if (epsHistory[0] > 0) {
      const rate = growthCAGR(epsHistory[0], epsHistory[maxIdx10], maxIdx10);
      avgHistGrowth = rate !== null ? rate : windowMedianGrowth(maxIdx10);
    } else {
      // Current EPS negative — CAGR meaningless, use median YoY growth
      avgHistGrowth = windowMedianGrowth(maxIdx10);
    }
  }

  // ── 5-year EPS CAGR — index 5 = 6 data points = 5 compounding periods ──
  let avgHistGrowth5yr = avgHistGrowth;  // fallback to 10yr if not enough data
  const maxIdx5 = Math.min(epsHistory.length - 1, 5);
  if (maxIdx5 >= 1 && maxIdx5 !== maxIdx10) {
    // Only compute separately when we have more data than the 5yr window
    if (epsHistory[0] > 0) {
      const rate = growthCAGR(epsHistory[0], epsHistory[maxIdx5], maxIdx5);
      avgHistGrowth5yr = rate !== null ? rate : windowMedianGrowth(maxIdx5);
    } else {
      avgHistGrowth5yr = windowMedianGrowth(maxIdx5);
    }
  }

  if (import.meta.env.DEV) {
    console.log(`[TUP CAGR] ${t} | maxIdx10=${maxIdx10} maxIdx5=${maxIdx5} | 10yr=${avgHistGrowth.toFixed(2)}% 5yr=${avgHistGrowth5yr.toFixed(2)}%`);
  }

  // ── Forward growth — estimate-to-estimate ratios ────────────────────────
  // Framework:
  //   EPS_T   = estFwd  (current fiscal year estimate)
  //   EPS_T+1 = estFwd2 (next fiscal year estimate)
  //   EPS_T+2 = estFwd3 (year after next estimate)
  //   G1 = (EPS_T+1 - EPS_T) / EPS_T
  //   G2 = (EPS_T+2 - EPS_T+1) / EPS_T+1
  //   analystGrowth = G1  (used in TUP blend: (G_hist + G1) / 2)
  const ttmEstEps    = epsOf(estTTM);
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

  // Forward EPS: analyst consensus for current year, normalized to current shares.
  const fwdEstEps  = epsT;    // kept for forwardEPS derivation below
  const fwd2EstEps = epsTp1;  // kept for compatibility

  // ── Forward growth components for variable rate sequence ─────────────────
  let fwdGrowthY1 = analystGrowth; // G1: (EPS_T+1 / EPS_T) - 1
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
    const freq             = adrRatio > 1 ? 2 : 4;
    const lastDivConverted = (p.lastDiv / adrRatio) * fxRate;
    dividendYield          = (lastDivConverted * freq) / livePrice * 100;
    divNote                = `lastDiv ${p.lastDiv.toFixed(4)} ÷ ${adrRatio} × ${fxRate.toFixed(4)} × ${freq} ÷ $${livePrice.toFixed(2)}`;
    log(`  ✓ Fwd div yield (manual lastDiv): ${dividendYield.toFixed(2)}%`);
  }

  if (dividendYield === 0) log(`  … No dividend data — yield defaulting to 0.00%`);

  // ── Valuation indicators ──────────────────────────────────────────────────
  const blendedGrowth   = fallbackHistGrowth;
  const peterLynchRatio = ttmEPS > 0 && blendedGrowth > 0
    ? ((q.price || p.price || 0) / ttmEPS) / blendedGrowth
    : null;
  const dcfValue        = dcfData?.[0]?.dcf ?? null;

  // Altman Z-Score
  const bs0 = bs;
  const bs1: FMPBalanceSheet = balanceSheet?.[1] ?? ({} as FMPBalanceSheet);
  const ta0 = bs0.totalAssets || 0;
  let altmanZ: number | null = null;
  if (ta0 > 0) {
    const wc0     = (bs0.totalCurrentAssets || 0) - (bs0.totalCurrentLiabilities || 0);
    const re0     = bs0.retainedEarnings || 0;
    const ebit0   = inc[0]?.operatingIncome || 0;
    const tl0     = bs0.totalLiabilities || 0;
    const rawRev0 = inc[0]?.revenue || 0;
    const tlConverted = tl0 * fxRate;
    if (tlConverted > 0) {
      altmanZ = parseFloat((
        1.2 * (wc0 / ta0)               +
        1.4 * (re0 / ta0)               +
        3.3 * (ebit0 / ta0)             +
        0.6 * (mktCapVal / tlConverted) +
        1.0 * (rawRev0 / ta0)
      ).toFixed(2));
    }
  }

  // Piotroski F-Score
  let piotroski: number | null = null;
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

  // ── Target margin & breakeven ─────────────────────────────────────────────
  const netIncome    = (inc[0]?.netIncome || 0) * fxRate;
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

  // ── Lifecycle stage ─────────────────────────────────────────────────────
  const lcRev0 = inc[0]?.revenue || 0;
  const lcRev1 = inc[1]?.revenue || 0;
  const lcRevGrowth = lcRev1 > 0 ? ((lcRev0 - lcRev1) / lcRev1) * 100 : null;
  const lcIsProfit = (inc[0]?.netIncome || 0) > 0;
  let lifecycleStage: LifecycleStage | null = null;
  if (lcRevGrowth !== null) {
    if (!lcIsProfit)                    lifecycleStage = "startup";
    else if (lcRevGrowth > 30)          lifecycleStage = "young_growth";
    else if (lcRevGrowth > 15)          lifecycleStage = "high_growth";
    else if (lcRevGrowth > 5)           lifecycleStage = "mature_growth";
    else if (lcRevGrowth >= 0)          lifecycleStage = "mature_stable";
    else                                lifecycleStage = "decline";
  }

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
    lifecycleStage,
    divNote,
    peterLynchRatio: peterLynchRatio != null ? parseFloat(Number(peterLynchRatio).toFixed(2)) : null,
    dcfValue: dcfValue != null ? parseFloat(Number(dcfValue).toFixed(2)) : null,
    altmanZ,
    piotroski,
    isConverted,
    currencyNote,
    currencyMismatchWarning,
    earningsSurprises: Array.isArray(earningsSurprises) ? earningsSurprises : [],
    cashFlowHistory: Array.isArray(cashFlows) ? cashFlows : [],
    incomeHistory: Array.isArray(income) ? income : [],
    description: p.description || "",
    exchange,
  };
}
