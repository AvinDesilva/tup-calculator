import { calcTUP } from "../verdictCard/calcTUP.ts";
import { sanitizedNetIncome } from "../tickerSearch/api.ts";
import type { FMPIncomeStatement, FMPBalanceSheet, HistoricalPricePoint, InputState } from "../types.ts";
import type { BacktestRow, BacktestSnapshot } from "./types.ts";
import { findPriceNear, calcForwardReturn, calcAlpha, calcMaxDrawdown, calcEarningsAccuracy } from "./performance.ts";

// ── EPS derivation helpers ────────────────────────────────────────────────────

function deriveEPS(inc: FMPIncomeStatement, fallbackShares: number): number {
  const ni = sanitizedNetIncome(inc, fallbackShares);
  const sh = inc.weightedAverageShsOutDil || inc.weightedAverageShsOut || fallbackShares;
  return sh > 0 ? ni / sh : 0;
}

/**
 * Winsorized median of YoY EPS growth rates from index 0..maxIdx (newest-first array).
 * Returns % (e.g. 12 = 12%).
 */
function winsorizedMedianGrowth(epsArr: number[], maxIdx: number): number {
  const rates: number[] = [];
  for (let i = 0; i < maxIdx; i++) {
    const cur = epsArr[i], prev = epsArr[i + 1];
    if (prev !== 0) {
      const gr = (cur - prev) / Math.abs(prev);
      if (isFinite(gr)) rates.push(Math.max(-1, Math.min(1, gr)));
    }
  }
  if (!rates.length) return 10;
  rates.sort((a, b) => a - b);
  const mid = Math.floor(rates.length / 2);
  return (rates.length % 2 !== 0 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2) * 100;
}

/**
 * Historical EPS CAGR as-of snapshot index `idx` (newest-first array).
 * `idx` is the snapshot position; historical data is epsArr[idx+1..end].
 */
function epsCAGRAtIndex(epsArr: number[], idx: number): number {
  const current = epsArr[idx];
  if (current <= 0) return winsorizedMedianGrowth(epsArr, idx);

  const last = epsArr.length - 1;
  // Try endpoint CAGR from oldest to current, then walk inward
  for (let j = last; j > idx + 1; j--) {
    const n = j - idx;
    const start = epsArr[j];
    if (start <= 0 || n < 2) continue;
    const rate = (Math.pow(current / start, 1 / n) - 1) * 100;
    if (Math.abs(rate) <= 100) return rate;
  }
  return winsorizedMedianGrowth(epsArr, idx);
}

// ── Balance sheet lookup ──────────────────────────────────────────────────────

function findBalanceSheet(
  bsHistory: FMPBalanceSheet[],
  calendarYear: string | number,
): FMPBalanceSheet | null {
  const yr = String(calendarYear);
  return bsHistory.find(b => String(b.calendarYear) === yr || (b.date ?? "").startsWith(yr)) ?? null;
}

// ── SMA200 approximation ─────────────────────────────────────────────────────

function calcSMA200(prices: HistoricalPricePoint[], beforeDate: string): number {
  const cutoff = new Date(beforeDate).getTime();
  const before = prices.filter(p => new Date(p.date).getTime() < cutoff);
  const window = before.slice(-40); // ~40 weekly closes ≈ 200 trading days
  if (window.length < 20) return 0;
  return window.reduce((s, p) => s + p.close, 0) / window.length;
}

// ── Forward EPS growth proxy ──────────────────────────────────────────────────

function yoyGrowthPct(epsFrom: number, epsTo: number): number {
  if (epsFrom <= 0) return 10; // fallback when base is negative/zero
  return ((epsTo - epsFrom) / Math.abs(epsFrom)) * 100;
}

// ── Main builder ─────────────────────────────────────────────────────────────

/**
 * Reconstructs historical TUP snapshots from annual financial data.
 *
 * @param incomeHistory     Newest-first income statements (from lookupTicker)
 * @param extBalanceSheet   12-year balance sheet (or shorter; may be empty)
 * @param priceHistory      Oldest-first weekly price history
 * @param spyPriceHistory   Oldest-first SPY weekly prices (empty = no alpha)
 * @param currentShares     Current shares outstanding (fallback)
 */
export function buildSnapshots(
  incomeHistory: FMPIncomeStatement[],
  extBalanceSheet: FMPBalanceSheet[],
  priceHistory: HistoricalPricePoint[],
  spyPriceHistory: HistoricalPricePoint[],
  currentShares: number,
): BacktestRow[] {
  // Need at least 3 entries: [Y+1, Y, Y-1] — Y for snapshot, Y+1 for fwd proxy, Y-1 for hist CAGR
  if (incomeHistory.length < 3) return [];
  if (!priceHistory.length) return [];

  // Precompute EPS for all years (newest-first, matching incomeHistory order)
  const epsArr: number[] = incomeHistory.map(inc =>
    deriveEPS(inc, inc.weightedAverageShsOut || currentShares)
  );

  const rows: BacktestRow[] = [];

  // Snapshots: index 1 to (n-2)
  //   - index 0 = most recent: no forward year available
  //   - index i-1 = forward proxy (Y+1, one year later)
  //   - index i+1..end = historical data for CAGR
  for (let i = 1; i <= incomeHistory.length - 2; i++) {
    const inc = incomeHistory[i];
    const fiscalDate = inc.date ?? `${inc.calendarYear ?? inc.fiscalYear}-12-31`;
    const calYear = inc.calendarYear ?? inc.fiscalYear ?? new Date(fiscalDate).getFullYear();

    // ── Price at fiscal year-end ────────────────────────────────────────────
    const snapshotPrice = findPriceNear(priceHistory, fiscalDate, 8);
    if (!snapshotPrice || snapshotPrice <= 0) continue;

    // ── Shares & EPS ────────────────────────────────────────────────────────
    const shares = inc.weightedAverageShsOutDil || inc.weightedAverageShsOut || currentShares;
    const eps    = epsArr[i];
    if (!shares || shares <= 0) continue;

    // ── Balance sheet ───────────────────────────────────────────────────────
    const bs = findBalanceSheet(extBalanceSheet, calYear);
    const debt = bs ? (bs.totalDebt || bs.longTermDebt || 0) : 0;
    const cash = bs ? (bs.cashAndShortTermInvestments || bs.cashAndCashEquivalents || 0) : 0;
    const debtAvailable = bs !== null;

    // ── Market cap & enterprise value ───────────────────────────────────────
    const marketCap = snapshotPrice * shares;

    // ── Historical CAGR as of this snapshot ─────────────────────────────────
    const historicalCAGR = epsCAGRAtIndex(epsArr, i);

    // ── Forward EPS proxies (actual next-year growth, stand-in for analyst est) ──
    // incomeHistory[i-1] = 1 year newer than snapshot (Y+1)
    // incomeHistory[i-2] = 2 years newer than snapshot (Y+2), if available
    const epsY1 = epsArr[i - 1];
    const epsY2 = i >= 2 ? epsArr[i - 2] : null;

    const fwdGrowthY1 = yoyGrowthPct(eps, epsY1);
    const fwdGrowthY2 = epsY2 != null && epsY1 > 0
      ? yoyGrowthPct(epsY1, epsY2)
      : null;

    // Clamp forward growth to reasonable range
    const fwdGrowthY1Clamped = Math.max(-50, Math.min(200, fwdGrowthY1));
    const fwdGrowthY2Clamped = fwdGrowthY2 != null
      ? Math.max(-50, Math.min(200, fwdGrowthY2))
      : null;

    // ── 200-SMA ─────────────────────────────────────────────────────────────
    const sma200 = calcSMA200(priceHistory, fiscalDate);

    // ── Operating margin ────────────────────────────────────────────────────
    const opIncome = inc.operatingIncome;
    const revenue  = inc.revenue;
    const operatingMargin = opIncome != null && revenue && revenue > 0
      ? (opIncome / revenue) * 100
      : null;

    // ── Forward EPS value for forwardEPS field ──────────────────────────────
    // Use actual Y+1 EPS as the "analyst consensus forward EPS"
    const forwardEPS = epsY1 || (eps > 0 ? eps * 1.1 : eps);

    // ── Construct InputState ─────────────────────────────────────────────────
    const inputState: InputState = {
      marketCap,
      debt,
      cash,
      shares,
      ttmEPS: eps,
      forwardEPS,
      historicalGrowth: historicalCAGR,
      analystGrowth: fwdGrowthY1Clamped,
      fwdGrowthY1: fwdGrowthY1Clamped,
      fwdGrowthY2: fwdGrowthY2Clamped,
      fwdCAGR: null,
      revenuePerShare: revenue && shares > 0 ? revenue / shares : 0,
      targetMargin: 15,
      inceptionGrowth: 0,
      breakEvenYear: 0,
      currentPrice: snapshotPrice,
      sma200,
      dividendYield: 0,
      operatingMargin,
      lifecycleStage: null,
      growthOverrides: {},
      decayMode: "ff",
    };

    const snapshot: BacktestSnapshot = {
      year: Number(calYear),
      fiscalYearEndDate: fiscalDate,
      snapshotPrice,
      eps,
      shares,
      marketCap,
      debtAvailable,
      historicalCAGR,
      fwdGrowthY1: fwdGrowthY1Clamped,
      fwdGrowthY2: fwdGrowthY2Clamped,
      sma200,
      inputState,
    };

    // ── Run calcTUP ──────────────────────────────────────────────────────────
    const tupResult = calcTUP(inputState, "standard");
    if (!tupResult) {
      // Still include row but as N/A signal
      rows.push({
        snapshot,
        verdict: "avoid",
        paybackYears: null,
        adjPrice: (marketCap + debt - cash) / shares,
        epsBase: null,
        grTerminal: null,
        fallingKnife: false,
        return3yr: calcForwardReturn(priceHistory, fiscalDate, snapshotPrice, 3),
        return5yr: calcForwardReturn(priceHistory, fiscalDate, snapshotPrice, 5),
        return7yr: calcForwardReturn(priceHistory, fiscalDate, snapshotPrice, 7),
        spyReturn3yr: calcForwardReturn(spyPriceHistory, fiscalDate, findPriceNear(spyPriceHistory, fiscalDate) ?? 0, 3),
        spyReturn5yr: calcForwardReturn(spyPriceHistory, fiscalDate, findPriceNear(spyPriceHistory, fiscalDate) ?? 0, 5),
        spyReturn7yr: calcForwardReturn(spyPriceHistory, fiscalDate, findPriceNear(spyPriceHistory, fiscalDate) ?? 0, 7),
        alpha3yr: null,
        alpha5yr: null,
        alpha7yr: null,
        maxDrawdown3yr: calcMaxDrawdown(priceHistory, fiscalDate, 3),
        earningsAccuracy: null,
        isPartial: true,
      });
      continue;
    }

    // ── Forward stock returns ────────────────────────────────────────────────
    const r3  = calcForwardReturn(priceHistory, fiscalDate, snapshotPrice, 3);
    const r5  = calcForwardReturn(priceHistory, fiscalDate, snapshotPrice, 5);
    const r7  = calcForwardReturn(priceHistory, fiscalDate, snapshotPrice, 7);

    // ── SPY returns ──────────────────────────────────────────────────────────
    const spyPrice = findPriceNear(spyPriceHistory, fiscalDate);
    const spy3 = spyPrice ? calcForwardReturn(spyPriceHistory, fiscalDate, spyPrice, 3) : null;
    const spy5 = spyPrice ? calcForwardReturn(spyPriceHistory, fiscalDate, spyPrice, 5) : null;
    const spy7 = spyPrice ? calcForwardReturn(spyPriceHistory, fiscalDate, spyPrice, 7) : null;

    // ── Earnings accuracy: predicted CAGR vs actual 3yr EPS CAGR ────────────
    // EPS 3 years from now = income[i-3] (3 more recent entries in newest-first array)
    const eps3yrLater = i >= 3 ? epsArr[i - 3] : null;
    const earningsAccuracy = calcEarningsAccuracy(
      tupResult.grTerminal * 100,
      eps,
      eps3yrLater,
    );

    const isPartial = r3 == null || r5 == null || r7 == null;

    rows.push({
      snapshot,
      verdict: tupResult.verdict,
      paybackYears: tupResult.payback,
      adjPrice: tupResult.adjPrice,
      epsBase: tupResult.epsBase,
      grTerminal: tupResult.grTerminal,
      fallingKnife: tupResult.fallingKnife,
      return3yr: r3,
      return5yr: r5,
      return7yr: r7,
      spyReturn3yr: spy3,
      spyReturn5yr: spy5,
      spyReturn7yr: spy7,
      alpha3yr: calcAlpha(r3, spy3),
      alpha5yr: calcAlpha(r5, spy5),
      alpha7yr: calcAlpha(r7, spy7),
      maxDrawdown3yr: calcMaxDrawdown(priceHistory, fiscalDate, 3),
      earningsAccuracy,
      isPartial,
    });
  }

  // Return oldest-first (chronological order) for the table display
  return rows.reverse();
}

// ── Summary computation ───────────────────────────────────────────────────────

export function computeSummary(rows: BacktestRow[]) {
  if (!rows.length) return null;

  const buyVerdicts = new Set(["strong_buy", "buy", "spec_buy"]);
  const buyRows = rows.filter(r => buyVerdicts.has(r.verdict));
  const buyRows5yr = buyRows.filter(r => r.alpha5yr != null);
  const wins = buyRows5yr.filter(r => (r.alpha5yr ?? 0) > 0).length;

  const allAlpha5 = buyRows5yr.map(r => r.alpha5yr as number);
  const avgAlpha5yr = allAlpha5.length
    ? allAlpha5.reduce((a, b) => a + b, 0) / allAlpha5.length
    : null;

  const paybacks = rows.filter(r => r.paybackYears != null).map(r => r.paybackYears as number);
  const avgPayback = paybacks.length
    ? paybacks.reduce((a, b) => a + b, 0) / paybacks.length
    : null;

  return {
    totalSnapshots: rows.length,
    buySignals: buyRows.length,
    winRate5yr: buyRows5yr.length ? (wins / buyRows5yr.length) * 100 : null,
    avgAlpha5yr,
    avgPayback,
  };
}
