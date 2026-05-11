import { useState, useEffect, useRef } from "react";
import { fetchFMP } from "../lib/tickerSearch/api.ts";
import { buildSnapshots, computeSummary } from "../lib/backtesting/buildSnapshots.ts";
import type { FMPBalanceSheet, FMPIncomeStatement, HistoricalPricePoint } from "../lib/types.ts";
import type { BacktestState } from "../lib/backtesting/types.ts";

// ── Module-level caches (survive tab switches, cleared on page reload) ────────

const spyCache: { data: HistoricalPricePoint[] | null; fetching: boolean } = {
  data: null,
  fetching: false,
};
const bsCache = new Map<string, FMPBalanceSheet[]>();

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseBacktestDataProps {
  ticker: string;
  enabled: boolean;
  incomeHistory: FMPIncomeStatement[];
  balanceSheetHistory: FMPBalanceSheet[];      // 6-year prefetched (fallback)
  priceHistory: HistoricalPricePoint[];
  shares: number;
}

const IDLE_STATE: BacktestState = {
  stage: "idle",
  rows: [],
  summary: null,
  error: null,
  spyUnavailable: false,
};

export function useBacktestData({
  ticker,
  enabled,
  incomeHistory,
  balanceSheetHistory,
  priceHistory,
  shares,
}: UseBacktestDataProps): BacktestState {
  const [state, setState] = useState<BacktestState>(IDLE_STATE);
  const abortRef  = useRef(false);
  const tickerRef = useRef("");

  useEffect(() => {
    if (!enabled || !ticker) return;

    // Reset when ticker changes
    if (ticker !== tickerRef.current) {
      tickerRef.current = ticker;
      abortRef.current  = true;          // abort any in-flight run for old ticker
      setState(IDLE_STATE);
    }

    // Guard: don't re-run if already done for this ticker
    if (state.stage === "done" || state.stage === "fetching" || state.stage === "computing") return;

    const run = async () => {
      abortRef.current = false;          // fresh run for this ticker

      if (incomeHistory.length < 3) {
        setState({ stage: "done", rows: [], summary: null, error: "Not enough historical data for backtesting. At least 3 years of income history required.", spyUnavailable: false });
        return;
      }
      if (!priceHistory.length) {
        setState({ stage: "done", rows: [], summary: null, error: "Price history unavailable for backtesting.", spyUnavailable: false });
        return;
      }

      setState(prev => ({ ...prev, stage: "fetching", error: null }));

      // ── Parallel: extended balance sheet + SPY prices ────────────────────
      let extBS: FMPBalanceSheet[] = bsCache.get(ticker) ?? [];
      let spyPrices: HistoricalPricePoint[] = spyCache.data ?? [];
      let spyUnavailable = false;

      if (!extBS.length || !spyPrices.length) {
        const fetches: Promise<void>[] = [];

        if (!extBS.length) {
          fetches.push(
            fetchFMP<FMPBalanceSheet[]>(`balance-sheet-statement?symbol=${ticker}&limit=12`)
              .then(data => {
                extBS = data || [];
                bsCache.set(ticker, extBS);
              })
              .catch(() => {
                extBS = balanceSheetHistory;  // fall back to prefetched 6-year data
              })
          );
        }

        if (!spyPrices.length && !spyCache.fetching) {
          spyCache.fetching = true;
          fetches.push(
            fetch(`/api/historical-price?symbol=SPY`)
              .then(r => r.ok ? r.json() as Promise<{ priceHistory: HistoricalPricePoint[] }> : { priceHistory: [] })
              .then(d => {
                spyCache.data = d.priceHistory;
                spyPrices = d.priceHistory;
              })
              .catch(() => {
                spyCache.data = [];
                spyUnavailable = true;
              })
              .finally(() => { spyCache.fetching = false; })
          );
        } else if (spyCache.fetching) {
          // Another tab triggered SPY fetch — wait briefly then use cache
          await new Promise(r => setTimeout(r, 500));
          spyPrices = spyCache.data ?? [];
        }

        await Promise.all(fetches);
      }

      if (abortRef.current) return;

      if (!spyPrices.length) spyUnavailable = true;

      setState(prev => ({ ...prev, stage: "computing" }));

      // ── Build snapshots (synchronous, fast) ──────────────────────────────
      const rows = buildSnapshots(
        incomeHistory,
        extBS.length ? extBS : balanceSheetHistory,
        priceHistory,
        spyPrices,
        shares,
      );

      if (abortRef.current) return;

      const summary = computeSummary(rows);

      setState({
        stage: "done",
        rows,
        summary,
        error: rows.length === 0 ? "No valid snapshots could be constructed from available data." : null,
        spyUnavailable,
      });
    };

    run().catch(err => {
      if (!abortRef.current) {
        setState({ stage: "error", rows: [], summary: null, error: String(err?.message ?? err), spyUnavailable: false });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, enabled]);

  return state;
}
