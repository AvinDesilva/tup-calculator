"use strict";

/**
 * FMP (Financial Modeling Prep) data fetcher for MCP server.
 *
 * Fetches ticker data from FMP API endpoints and derives the InputState
 * needed for calcTUP, mirroring the logic in src/lib/tickerSearch/api.ts.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

function fmpUrl(endpoint, params, apiKey) {
  const qs = new URLSearchParams({ ...params, apikey: apiKey });
  return `${FMP_BASE}/${endpoint}?${qs}`;
}

async function fmpFetch(endpoint, params, apiKey) {
  try {
    const res = await fetch(fmpUrl(endpoint, params, apiKey));
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

/**
 * Search for ticker symbols matching a query.
 */
async function searchTickers(query, apiKey) {
  const [symbolRes, nameRes] = await Promise.all([
    fmpFetch("search-symbol", { query, limit: "15" }, apiKey),
    fmpFetch("search-name", { query, limit: "15" }, apiKey),
  ]);

  const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "NYSEAMERICAN", "NYSEARCA"]);
  const seen = new Set();
  const merged = [];
  for (const item of [...symbolRes, ...nameRes]) {
    if (!item.symbol || seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    merged.push({
      symbol: item.symbol,
      name: item.name || item.companyName || "",
      exchange: item.exchangeShortName || item.exchange || "",
      currency: item.currency || "",
    });
  }

  // Prefer US exchanges, exact matches first
  const uq = query.toUpperCase();
  merged.sort((a, b) => {
    const aUS = US_EXCHANGES.has(a.exchange.toUpperCase()) ? 0 : 1;
    const bUS = US_EXCHANGES.has(b.exchange.toUpperCase()) ? 0 : 1;
    if (aUS !== bUS) return aUS - bUS;
    const aExact = a.symbol.toUpperCase() === uq ? 0 : 1;
    const bExact = b.symbol.toUpperCase() === uq ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return a.symbol.localeCompare(b.symbol);
  });

  return merged.slice(0, 10);
}

/**
 * Compute winsorized median of an array (clamp extremes to ±100%).
 */
function winsorizedMedian(arr) {
  if (!arr.length) return 0;
  const clamped = arr.map(v => Math.max(-1, Math.min(1, v)));
  const sorted = [...clamped].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Fetch comprehensive data for a ticker and derive TUP inputs.
 */
async function lookupTicker(ticker, apiKey) {
  const sym = ticker.toUpperCase().trim();
  const symParam = { symbol: sym };

  // Fire all FMP requests in parallel
  const [profiles, quotes, balanceSheets, incomeStmts, estimates, cashFlows] = await Promise.all([
    fmpFetch("profile", symParam, apiKey),
    fmpFetch("quote", symParam, apiKey),
    fmpFetch("balance-sheet-statement", { ...symParam, limit: "6" }, apiKey),
    fmpFetch("income-statement", { ...symParam, limit: "12" }, apiKey),
    fmpFetch("analyst-estimates", { ...symParam, limit: "2" }, apiKey),
    fmpFetch("cash-flow-statement", { ...symParam, limit: "6" }, apiKey),
  ]);

  const p = profiles?.[0] || {};
  const q = quotes?.[0] || {};
  const bs = balanceSheets || [];
  const inc = incomeStmts || [];
  const est = estimates || [];
  const cf = cashFlows || [];

  // ── Basic company info ─────────────────────────────────────────────────
  const companyName = p.companyName || sym;
  const sector = p.sector || "Unknown";
  const industry = p.industry || "Unknown";
  const exchange = p.exchangeShortName || p.exchange || "";
  const description = p.description || "";

  // ── Market data ────────────────────────────────────────────────────────
  const marketCap = q.marketCap || p.mktCap || 0;
  const currentPrice = q.price || p.price || 0;
  const shares = q.sharesOutstanding || (marketCap && currentPrice ? marketCap / currentPrice : 0);
  const sma200 = q.priceAvg200 || 0;
  const dividendYield = q.dividendYield || 0;

  // ── TTM EPS ────────────────────────────────────────────────────────────
  const ttmEPS = q.eps || 0;

  // ── Balance sheet ──────────────────────────────────────────────────────
  const latestBS = bs[0] || {};
  const debt = latestBS.totalDebt || latestBS.longTermDebt || 0;
  const cash = latestBS.cashAndShortTermInvestments || latestBS.cashAndCashEquivalents || 0;

  // ── Income history → historical growth (winsorized median CAGR) ────────
  const validInc = inc
    .filter(r => r.netIncome != null && r.revenue != null)
    .sort((a, b) => String(a.calendarYear || a.date).localeCompare(String(b.calendarYear || b.date)));

  // Compute year-over-year EPS growth rates
  const yoyGrowths = [];
  for (let i = 1; i < validInc.length; i++) {
    const prevShares = validInc[i - 1].weightedAverageShsOutDil || validInc[i - 1].weightedAverageShsOut || shares;
    const currShares = validInc[i].weightedAverageShsOutDil || validInc[i].weightedAverageShsOut || shares;
    const prevEPS = prevShares > 0 ? validInc[i - 1].netIncome / prevShares : 0;
    const currEPS = currShares > 0 ? validInc[i].netIncome / currShares : 0;
    if (prevEPS > 0 && currEPS > 0) {
      yoyGrowths.push((currEPS - prevEPS) / prevEPS);
    }
  }

  const historicalGrowth = yoyGrowths.length > 0
    ? winsorizedMedian(yoyGrowths) * 100
    : 10; // fallback 10%

  // ── Analyst estimates → forward growth ─────────────────────────────────
  const est0 = est[0] || {};
  const est1 = est[1] || {};
  const forwardEPS = est0.epsAvg || ttmEPS * 1.1 || 0;

  // Forward growth Y1: (fwdEPS / ttmEPS - 1)
  let fwdGrowthY1 = ttmEPS > 0 && forwardEPS > 0
    ? ((forwardEPS / ttmEPS) - 1) * 100
    : historicalGrowth;

  // Forward growth Y2
  let fwdGrowthY2 = null;
  if (est1.epsAvg && est0.epsAvg && est0.epsAvg > 0) {
    fwdGrowthY2 = ((est1.epsAvg / est0.epsAvg) - 1) * 100;
  }

  const analystGrowth = fwdGrowthY1;

  // ── Revenue per share ──────────────────────────────────────────────────
  const latestInc = inc[0] || {};
  const latestShares = latestInc.weightedAverageShsOutDil || latestInc.weightedAverageShsOut || shares;
  const revenuePerShare = latestShares > 0 ? (latestInc.revenue || 0) / latestShares : 0;

  // ── Operating margin ───────────────────────────────────────────────────
  let operatingMargin = null;
  if (latestInc.operatingIncome != null && latestInc.revenue > 0) {
    operatingMargin = (latestInc.operatingIncome / latestInc.revenue) * 100;
  }

  // ── Lifecycle stage (simplified) ───────────────────────────────────────
  let lifecycleStage = null;
  if (operatingMargin != null) {
    if (operatingMargin < 0) lifecycleStage = "startup";
    else if (historicalGrowth > 30) lifecycleStage = "high_growth";
    else if (historicalGrowth > 15) lifecycleStage = "young_growth";
    else if (historicalGrowth > 5) lifecycleStage = "mature_growth";
    else if (historicalGrowth >= 0) lifecycleStage = "mature_stable";
    else lifecycleStage = "decline";
  }

  // ── Pre-profit fields ──────────────────────────────────────────────────
  const targetMargin = 15; // default target net margin for pre-profit
  const inceptionGrowth = historicalGrowth;
  const breakEvenYear = ttmEPS <= 0 ? 3 : 1;

  return {
    companyName,
    ticker: sym,
    sector,
    industry,
    exchange,
    description,
    marketCap,
    debt,
    cash,
    shares,
    ttmEPS,
    forwardEPS,
    historicalGrowth: +historicalGrowth.toFixed(2),
    analystGrowth: +analystGrowth.toFixed(2),
    fwdGrowthY1: +fwdGrowthY1.toFixed(2),
    fwdGrowthY2: fwdGrowthY2 != null ? +fwdGrowthY2.toFixed(2) : null,
    revenuePerShare: +revenuePerShare.toFixed(4),
    targetMargin,
    inceptionGrowth: +inceptionGrowth.toFixed(2),
    breakEvenYear,
    currentPrice,
    sma200,
    dividendYield: +dividendYield.toFixed(2),
    operatingMargin: operatingMargin != null ? +operatingMargin.toFixed(2) : null,
    lifecycleStage,
  };
}

module.exports = { searchTickers, lookupTicker };
