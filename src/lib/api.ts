import { FMP, ADR_RATIO_TABLE, EXCHANGE_CCY, FALLBACK_FX } from "./constants.ts";
import { f, fB } from "./utils.ts";
import type {
  TickerData,
  FMPProfile, FMPQuote, FMPBalanceSheet, FMPIncomeStatement,
  FMPFinancialGrowth, FMPEstimate, FMPKeyMetrics,
  FMPDividend, FMPDividendHistory, FMPDCF,
  FMPEarningSurprise, FMPCashFlow,
} from "./types.ts";

// ─── Low-level HTTP wrapper ───────────────────────────────────────────────────

export async function fetchFMP<T = unknown>(endpoint: string, apiKey: string): Promise<T> {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `${FMP}/${endpoint}${sep}apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP ${res.status}: ${res.statusText} — ${endpoint}`);
  return res.json() as T;
}

// ─── Main data fetch ──────────────────────────────────────────────────────────

/**
 * Fetches all FMP endpoints in parallel and derives every calculator field.
 */
export async function lookupTicker(
  ticker: string,
  apiKey: string,
  log: (msg: string) => void,
): Promise<TickerData> {
  const t = ticker.toUpperCase();

  log(`Fetching data for ${t} from FMP endpoints...`);

  const [profile, quote, balanceSheet, income, growth, estimates, keyMetrics, divHistory, dcfData, earningsSurprises, cashFlows] = await Promise.all([
    // 1) Company Profile
    fetchFMP<FMPProfile[]>(`profile?symbol=${t}`, apiKey).then(d => { log("  ✓ /profile — company info, market cap"); return d; }),

    // 2) Real-time Quote
    fetchFMP<FMPQuote[]>(`quote?symbol=${t}`, apiKey).then(d => { log("  ✓ /quote — price, TTM EPS, shares, 200-SMA, dividendYield"); return d; }),

    // 3) Balance Sheet (2 years)
    fetchFMP<FMPBalanceSheet[]>(`balance-sheet-statement?symbol=${t}&limit=2`, apiKey).then(d => { log("  ✓ /balance-sheet-statement — debt, cash (2 yrs)"); return d; }),

    // 4) Income Statement (10 years)
    fetchFMP<FMPIncomeStatement[]>(`income-statement?symbol=${t}&limit=10`, apiKey).then(d => { log("  ✓ /income-statement — revenue, net income (10 yrs)"); return d; }),

    // 5) Financial Growth (10 years)
    fetchFMP<FMPFinancialGrowth[]>(`financial-growth?symbol=${t}&limit=10`, apiKey).then(d => { log("  ✓ /financial-growth — EPS growth history (10 yrs)"); return d; }),

    // 6) Analyst Estimates
    fetchFMP<FMPEstimate[]>(`analyst-estimates?symbol=${t}&period=annual&limit=5`, apiKey)
      .then(d => { log("  ✓ /analyst-estimates — forward EPS & revenue est."); return d; })
      .catch(() => { log("  ⚠ /analyst-estimates — not available (free plan)"); return [] as FMPEstimate[]; }),

    // 7) Key Metrics TTM
    fetchFMP<FMPKeyMetrics[]>(`key-metrics-ttm?symbol=${t}`, apiKey)
      .then(d => { log("  ✓ /key-metrics-ttm — dividend yield TTM fallback"); return d; })
      .catch(() => { log("  ⚠ /key-metrics-ttm — not available"); return [] as FMPKeyMetrics[]; }),

    // 8) Dividend history
    fetchFMP<FMPDividend[] | FMPDividendHistory>(`dividends?symbol=${t}&limit=8`, apiKey)
      .then(d => { log("  ✓ /dividends — dividend history for forward yield"); return d; })
      .catch(() => { log("  ⚠ /dividends — not available"); return [] as FMPDividend[]; }),

    // 9) Discounted Cash Flow
    fetchFMP<FMPDCF[]>(`discounted-cash-flow?symbol=${t}`, apiKey)
      .then(d => { log("  ✓ /discounted-cash-flow — DCF intrinsic value"); return d; })
      .catch(() => { log("  ⚠ /discounted-cash-flow — not available"); return [] as FMPDCF[]; }),

    // 10) Earnings Surprises
    fetchFMP<FMPEarningSurprise[]>(`earnings-surprises?symbol=${t}`, apiKey)
      .then(d => { log("  ✓ /earnings-surprises — analyst beat/miss history"); return d; })
      .catch(() => { log("  ⚠ /earnings-surprises — not available"); return [] as FMPEarningSurprise[]; }),

    // 11) Cash Flow Statement (10 years)
    fetchFMP<FMPCashFlow[]>(`cash-flow-statement?symbol=${t}&limit=10`, apiKey)
      .then(d => { log("  ✓ /cash-flow-statement — operating/investing/financing flows"); return d; })
      .catch(() => { log("  ⚠ /cash-flow-statement — not available"); return [] as FMPCashFlow[]; }),
  ]);

  if (!profile?.[0] || !quote?.[0]) throw new Error("Ticker not found or API limit reached.");

  const p   = profile[0];
  const q   = quote[0];
  const bs  = balanceSheet?.[0] ?? ({} as FMPBalanceSheet);
  const inc = income ?? [];
  const gr  = growth ?? [];

  // ── Currency normalisation ────────────────────────────────────────────────
  const exchange        = (p.exchangeShortName || p.exchange || "").toUpperCase();
  const priceCurrency   = EXCHANGE_CCY[exchange] || p.currency || "USD";
  const financialsCurrency = inc[0]?.reportingCurrency || p.currency || "USD";

  console.log(`[TUP FX] ticker=${t} exchange=${exchange} priceCurrency=${priceCurrency} financialsCurrency=${financialsCurrency}`);

  let fxRate = 1;
  let isConverted = false;
  let currencyNote = "";

  if (priceCurrency !== financialsCurrency) {
    const fxSymbol = `${financialsCurrency}${priceCurrency}`;
    try {
      let fxData = await fetchFMP<Array<{ price?: number; bid?: number; ask?: number }>>(`fx?symbol=${fxSymbol}`, apiKey).catch(() => []);
      let rate   = fxData?.[0]?.price ?? fxData?.[0]?.bid ?? fxData?.[0]?.ask;
      if (!(rate != null && rate > 0)) {
        log(`  … /fx returned no rate, trying /quote/${fxSymbol}`);
        fxData = await fetchFMP<Array<{ price?: number; bid?: number }>>(`quote/${fxSymbol}`, apiKey).catch(() => []);
        rate   = fxData?.[0]?.price ?? fxData?.[0]?.bid;
      }
      if (!(rate != null && rate > 0) && FALLBACK_FX[fxSymbol]) {
        rate = FALLBACK_FX[fxSymbol];
        log(`  ⚠ FX API returned no rate — using hardcoded ${fxSymbol} fallback: ${rate}`);
      }
      console.log(`[TUP FX] ${fxSymbol} rate=${rate} raw=`, fxData?.[0]);
      if (rate != null && rate > 0) {
        fxRate       = rate;
        isConverted  = true;
        currencyNote = `${financialsCurrency} → ${priceCurrency} @ ${rate.toFixed(4)}`;
        log(`  ✓ FX ${fxSymbol}: ${rate.toFixed(6)} — financials converted to ${priceCurrency}`);
      } else {
        log(`  ⚠ FX rate unavailable for ${fxSymbol} — proceeding with unconverted values`);
      }
    } catch (e) {
      console.error(`[TUP FX] fetch error for ${fxSymbol}:`, e);
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

  // ── ADR adjustment + EPS ──────────────────────────────────────────────────
  const adrRatio     = ADR_RATIO_TABLE[t] || 1;
  const rawQuoteEPS  = q.eps || 0;
  const rawIncomeEPS = sharesOut > 0 && (inc[0]?.netIncome || 0) !== 0
    ? ((inc[0].netIncome ?? 0) / sharesOut) : 0;
  const rawTTMEPS    = rawQuoteEPS || rawIncomeEPS;
  const ttmEPS       = (rawTTMEPS / adrRatio) * fxRate;

  console.log(
    `[TUP EPS] ${t} | rawEPS=${rawTTMEPS.toFixed(4)} ${financialsCurrency}` +
    ` | ÷${adrRatio} → adrAdj=${(rawTTMEPS / adrRatio).toFixed(4)}` +
    ` | ×${fxRate.toFixed(6)} → finalEPS=${ttmEPS.toFixed(4)} ${priceCurrency}`
  );

  // ── Analyst estimates ─────────────────────────────────────────────────────
  const today     = new Date();
  const sortedEst = [...(estimates || [])].sort((a, b) => new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime());
  const pastEst   = sortedEst.filter(e => new Date(e.date ?? "").getTime() <= today.getTime());
  const futureEst = sortedEst.filter(e => new Date(e.date ?? "").getTime() >  today.getTime());
  const estTTM    = pastEst[pastEst.length - 1] ?? null;
  const estFwd    = futureEst[0]    ?? null;
  const estFwd2   = futureEst[1]    ?? null;
  const estOldest = pastEst[0]      ?? null;

  const epsOf = (e: FMPEstimate | null): number => ((e?.epsAvg || 0) / adrRatio) * fxRate;

  const forwardEPS    = (estFwd ? epsOf(estFwd) : 0) || (ttmEPS > 0 ? ttmEPS * 1.1 : 0);
  const latestRevenue = (inc[0]?.revenue || 0) * fxRate;
  const revenuePerShare = sharesOut > 0 ? latestRevenue / sharesOut : 0;

  // ── Historical EPS growth — median over profitable years ──────────────────
  const profitableYearSet = new Set(
    inc.filter(y => (y.netIncome || 0) > 0)
       .map(y => String(y.calendarYear || (y.date || "").slice(0, 4))));
  const validGr = gr.filter(g => {
    const yr = String(g.calendarYear || (g.date || "").slice(0, 4));
    return g.epsgrowth != null
      && isFinite(g.epsgrowth)
      && Math.abs(g.epsgrowth) < 10
      && (profitableYearSet.size === 0 || profitableYearSet.has(yr));
  });
  const sortedGrVals = validGr.map(g => g.epsgrowth as number).sort((a, b) => a - b);
  const grMid    = Math.floor(sortedGrVals.length / 2);
  const grMedian = sortedGrVals.length === 0 ? null
    : sortedGrVals.length % 2 !== 0
      ? sortedGrVals[grMid]
      : (sortedGrVals[grMid - 1] + sortedGrVals[grMid]) / 2;
  const fallbackHistGrowth = grMedian != null ? grMedian * 100 : 10;

  let avgHistGrowth = fallbackHistGrowth;
  if (estTTM && estOldest && estTTM !== estOldest) {
    const n         = pastEst.length - 1;
    const ttmEstEps = epsOf(estTTM);
    const oldEstEps = epsOf(estOldest);
    if (n > 0 && oldEstEps > 0 && ttmEstEps > 0) {
      avgHistGrowth = (Math.pow(ttmEstEps / oldEstEps, 1 / n) - 1) * 100;
    }
  }

  // ── Analyst forward growth — 2-year CAGR where available ─────────────────
  let analystGrowth  = avgHistGrowth * 0.8;
  const ttmEstEps    = epsOf(estTTM);
  const fwdEstEps    = epsOf(estFwd);
  const fwd2EstEps   = epsOf(estFwd2);
  if (fwd2EstEps && ttmEstEps && ttmEstEps > 0 && fwd2EstEps > 0) {
    analystGrowth = (Math.sqrt(fwd2EstEps / ttmEstEps) - 1) * 100;
  } else if (fwdEstEps && ttmEstEps && ttmEstEps > 0) {
    analystGrowth = ((fwdEstEps / ttmEstEps) - 1) * 100;
  } else {
    const estRev  = (estFwd?.revenueAvg  || 0) * fxRate;
    const estRev2 = (estFwd2?.revenueAvg || 0) * fxRate;
    if (estRev2 > 0 && latestRevenue > 0) {
      analystGrowth = (Math.sqrt(estRev2 / latestRevenue) - 1) * 100;
    } else if (estRev > 0 && latestRevenue > 0) {
      analystGrowth = ((estRev - latestRevenue) / latestRevenue) * 100;
    }
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

  // Tier 1: dividends endpoint
  const divRecs: FMPDividend[] = Array.isArray(divHistory)
    ? divHistory
    : ((divHistory as FMPDividendHistory)?.historical || []);
  if (divRecs.length > 0 && livePrice > 0) {
    const latest = divRecs[0];
    const adjDiv = latest.adjDividend || latest.dividend || 0;
    if (adjDiv > 0) {
      const freqStr    = (latest.frequency || "").toLowerCase().replace(/[^a-z-]/g, "");
      const multiplier = FREQ_MAP[freqStr] || inferFreq(divRecs);
      dividendYield    = (adjDiv * multiplier / livePrice) * 100;
      divNote          = `adjDiv $${adjDiv.toFixed(4)} × ${multiplier} (${latest.frequency || `inferred×${multiplier}`}) ÷ $${livePrice.toFixed(2)}`;
      log(`  ✓ Fwd div yield (dividends): adjDiv=${adjDiv} × ${multiplier} / $${livePrice} = ${dividendYield.toFixed(2)}%`);
    }
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

  // Tier 3: key-metrics-ttm.dividendYieldTTM
  if (dividendYield === 0) {
    const km = keyMetrics?.[0];
    const y3 = normYield(km?.dividendYieldTTM ?? km?.dividendYield);
    if (y3 > 0) {
      dividendYield = y3;
      divNote       = `key-metrics-ttm.dividendYieldTTM = ${km?.dividendYieldTTM ?? km?.dividendYield}`;
      log(`  ✓ Fwd div yield (key-metrics-ttm): ${dividendYield.toFixed(2)}%`);
    }
  }

  // Tier 4: manual from profile.lastDiv
  if (dividendYield === 0 && p.lastDiv && p.lastDiv > 0 && livePrice > 0) {
    const freq             = adrRatio > 1 ? 2 : 4;
    const lastDivConverted = (p.lastDiv / adrRatio) * fxRate;
    dividendYield          = (lastDivConverted * freq) / livePrice * 100;
    divNote                = `lastDiv ${p.lastDiv.toFixed(4)} ÷ ${adrRatio} × ${fxRate.toFixed(4)} × ${freq} ÷ $${livePrice.toFixed(2)}`;
    log(`  ✓ Fwd div yield (manual lastDiv): ${dividendYield.toFixed(2)}%`);
  }

  if (dividendYield === 0) log(`  … No dividend data — yield defaulting to 0.00%`);

  // ── Valuation indicators ──────────────────────────────────────────────────
  const km              = keyMetrics?.[0];
  const peterLynchRatio = km?.priceToEarningsToGrowthRatio ?? km?.pegRatio ?? null;
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
  log(`  Shares: ${(sharesOut / 1e9).toFixed(3)}B  |  TTM EPS: $${f(ttmEPS)}  |  Fwd EPS: $${forwardEPS.toFixed(2)}`);
  log(`  Hist Growth: ${avgHistGrowth.toFixed(1)}%  |  Analyst Growth: ${analystGrowth.toFixed(1)}%  |  Fwd Div Yield: ${dividendYield.toFixed(2)}%`);
  log(`  Price: $${q.price}  |  200-SMA: $${q.priceAvg200 || "N/A"}`);

  return {
    companyName: p.companyName || t,
    ticker: t,
    sector: p.sector || "",
    industry: p.industry || "",
    marketCap: p.mktCap || q.marketCap || 0,
    debt: totalDebt,
    cash: totalCash,
    shares: sharesOut,
    ttmEPS,
    forwardEPS: parseFloat(forwardEPS.toFixed(2)),
    historicalGrowth: parseFloat(avgHistGrowth.toFixed(2)),
    analystGrowth: parseFloat(analystGrowth.toFixed(2)),
    revenuePerShare: parseFloat(revenuePerShare.toFixed(2)),
    targetMargin: parseFloat(targetMargin.toFixed(1)),
    inceptionGrowth: parseFloat(inceptionGrowth.toFixed(2)),
    breakEvenYear,
    currentPrice: q.price || p.price || 0,
    sma200: q.priceAvg200 || 0,
    dividendYield: parseFloat(dividendYield.toFixed(2)),
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
  };
}
