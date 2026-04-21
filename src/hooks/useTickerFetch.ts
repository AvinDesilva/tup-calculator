import { useState, useEffect, useRef } from "react";

import { calcTUP } from "../lib/verdictCard/calcTUP.ts";
import { lookupTicker, lookupTickerQuick, fetchFilteredPool } from "../lib/tickerSearch/api.ts";
import { fetchInsiderTrading } from "../lib/insiderTrading/fetch.ts";
import type { InputState, GrowthScenario, RollFilters, TupRangeFilter, HistoricalPricePoint } from "../lib/types.ts";
import * as dev from "../lib/devData.ts";
import { computeGuruData } from "../lib/guruRadar/computeGuruData.ts";
import type { GuruRadarData } from "../lib/guruRadar/types.ts";

import type { ValuationState, ScorecardState, UseTickerFetchReturn } from "./useTickerFetch.types.ts";

// ─── Constants & helpers ──────────────────────────────────────────────────────

const DICE_PHRASES = ["Rolling...", "Scanning...", "Searching...", "Thinking...", "Casting...", "Praying..."];

function matchesTupRange(pb: number, ranges: TupRangeFilter[]): boolean {
  if (ranges.length === 0) return pb > 4 && pb < 18;
  return ranges.some(r => {
    if (r === "≤7")    return pb <= 7;
    if (r === "≤9")    return pb > 7  && pb <= 9;
    if (r === "10–12") return pb >= 10 && pb <= 12;
    if (r === "13–15") return pb >= 13 && pb <= 15;
    if (r === "15+")   return pb > 15;
    return false;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTickerFetch(): UseTickerFetchReturn {
  // Search / loading
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchLog, setFetchLog] = useState<string[]>([]);

  // Dice roll
  const [rollingDice, setRollingDice] = useState(false);
  const diceAbortRef = useRef(false);
  const [dicePhrase, setDicePhrase] = useState(DICE_PHRASES[0]);

  // Dice filters
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rollFilters, setRollFilters] = useState<RollFilters>({ marketCap: [], sector: "", exchange: [], indexEtf: "", tupRange: [] });
  const hasActiveFilters = rollFilters.marketCap.length > 0 || rollFilters.sector !== "" || rollFilters.exchange.length > 0 || rollFilters.indexEtf !== "" || rollFilters.tupRange.length > 0;

  // Company data
  const [company, setCompany] = useState("");
  const [meta, setMeta] = useState<{ sector: string; industry: string }>({ sector: "", industry: "" });
  const [isConverted, setIsConverted] = useState(false);
  const [currencyNote, setCurrencyNote] = useState("");
  const [currencyMismatchWarning, setCurrencyMismatchWarning] = useState("");
  const [valuation, setValuation] = useState<ValuationState>({ insiderTrading: null, insiderTradingLoading: false });
  const [scorecard, setScorecard] = useState<ScorecardState>({ cashFlows: [], incomeHistory: [], epsGrowthHistory: [], description: "" });

  const [hasSearched, setHasSearched] = useState(false);
  const [priceHistory, setPriceHistory] = useState<HistoricalPricePoint[]>([]);
  const [guruData, setGuruData] = useState<GuruRadarData | null>(null);

  // Calculator inputs
  const [inp, setInp] = useState<InputState>({
    marketCap: 0, debt: 0, cash: 0, shares: 1,
    ttmEPS: 0, forwardEPS: 0, historicalGrowth: 10, analystGrowth: 10, fwdGrowthY1: 10, fwdGrowthY2: null, fwdCAGR: null,
    revenuePerShare: 0, targetMargin: 15, inceptionGrowth: 30, breakEvenYear: 2,
    currentPrice: 0, sma200: 0, dividendYield: 0, operatingMargin: null, lifecycleStage: null, growthOverrides: {}, decayMode: "ff",
  });

  // Target prices & growth
  const [strongBuyPrice, setStrongBuyPrice] = useState<number | null>(null);
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<"5yr" | "10yr">("5yr");
  const [growthValues, setGrowthValues] = useState<{ g5: number; g10: number }>({ g5: 10, g10: 10 });
  const [growthYears, setGrowthYears] = useState<{ short: number; long: number }>({ short: 5, long: 10 });

  // Growth scenarios
  const [growthScenario, setGrowthScenario] = useState<GrowthScenario>("base");
  const [scenarioValues, setScenarioValues] = useState<Record<GrowthScenario, { y1: number; y2: number | null; cagr: number | null }>>({
    bear: { y1: 0, y2: null, cagr: null },
    base: { y1: 0, y2: null, cagr: null },
    bull: { y1: 0, y2: null, cagr: null },
  });
  const hasScenarioData = scenarioValues.bear.y1 !== 0 || scenarioValues.bull.y1 !== 0;

  // URL overrides (consumed once on first fetch after mount)
  const urlOverridesRef = useRef<{ hg: number | null; gp: "10yr" | null } | null>(null);

  // ─── Dice phrase rotation ─────────────────────────────────────────────────

  useEffect(() => {
    if (!rollingDice) return;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % DICE_PHRASES.length; setDicePhrase(DICE_PHRASES[i]); }, 800);
    return () => clearInterval(id);
  }, [rollingDice]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const cancelDice = () => { diceAbortRef.current = true; };

  const doFetch = async (tickerOverride?: string): Promise<number | null> => {
    const t = (tickerOverride || ticker).trim().toUpperCase();
    if (!t) { setError("Enter a ticker symbol."); return null; }
    let paybackResult: number | null = null;
    setLoading(true); setError(""); setFetchLog([]); setIsConverted(false); setCurrencyNote(""); setCurrencyMismatchWarning(""); setValuation({ insiderTrading: null, insiderTradingLoading: false }); setScorecard({ cashFlows: [], incomeHistory: [], epsGrowthHistory: [], description: "" }); setStrongBuyPrice(null); setBuyPrice(null); setGuruData(null); setHasSearched(true);
    window.scrollTo(0, 0);

    const log = (msg: string) => setFetchLog(p => [...p, msg]);
    try {
      const data = await lookupTicker(t, log);

      setGuruData(computeGuruData(data));
      setCompany(data.companyName);
      setMeta({ sector: data.sector, industry: data.industry });
      setIsConverted(data.isConverted || false);
      setCurrencyNote(data.currencyNote || "");
      setCurrencyMismatchWarning(data.currencyMismatchWarning || "");
      // Fire insider trading fetch asynchronously (non-blocking)
      setValuation(prev => ({ ...prev, insiderTradingLoading: true }));
      fetchInsiderTrading(t).then(it => {
        setValuation(prev => ({ ...prev, insiderTrading: it, insiderTradingLoading: false }));
      });
      setScorecard({ cashFlows: data.cashFlowHistory, incomeHistory: data.incomeHistory, epsGrowthHistory: data.epsGrowthHistory, description: data.description });
      setPriceHistory(data.priceHistory ?? []);

      setGrowthValues({ g5: data.historicalGrowth5yr, g10: data.historicalGrowth });
      setGrowthYears({ short: data.epsYearsShort, long: data.epsYearsLong });
      setGrowthScenario("base");
      setScenarioValues({
        bear: { y1: data.fwdGrowthY1Bear ?? 0, y2: data.fwdGrowthY2Bear, cagr: data.fwdCAGRBear },
        base: { y1: data.fwdGrowthY1, y2: data.fwdGrowthY2, cagr: data.fwdCAGR },
        bull: { y1: data.fwdGrowthY1Bull ?? 0, y2: data.fwdGrowthY2Bull, cagr: data.fwdCAGRBull },
      });
      let finalGrowthPeriod: "5yr" | "10yr" = "5yr";
      const origInp: InputState = {
        marketCap: data.marketCap, debt: data.debt, cash: data.cash, shares: data.shares,
        ttmEPS: data.ttmEPS, forwardEPS: data.forwardEPS,
        historicalGrowth: data.historicalGrowth5yr, analystGrowth: data.analystGrowth,
        fwdGrowthY1: data.fwdGrowthY1, fwdGrowthY2: data.fwdGrowthY2, fwdCAGR: data.fwdCAGR,
        revenuePerShare: data.revenuePerShare, targetMargin: data.targetMargin,
        inceptionGrowth: data.inceptionGrowth, breakEvenYear: data.breakEvenYear,
        currentPrice: data.currentPrice, sma200: data.sma200,
        dividendYield: data.dividendYield || 0, operatingMargin: data.operatingMargin ?? null, lifecycleStage: data.lifecycleStage, growthOverrides: {}, decayMode: "ff",
      };
      let finalInp = origInp;
      const overrides = urlOverridesRef.current;
      if (overrides) {
        if (overrides.gp === "10yr" && data.epsYearsLong > data.epsYearsShort) {
          finalGrowthPeriod = "10yr";
          finalInp = { ...finalInp, historicalGrowth: data.historicalGrowth };
        }
        if (overrides.hg !== null) finalInp = { ...finalInp, historicalGrowth: overrides.hg };
        urlOverridesRef.current = null;
      }
      setGrowthPeriod(finalGrowthPeriod);
      setInp(finalInp);

      // Compute target prices from calcTUP rows (consistent with VDR + Y1/Y2 growth)
      const origResult = calcTUP(origInp, "standard");
      paybackResult = origResult?.payback ?? null;
      if (origResult && origResult.epsBase > 0 && origResult.gr > 0 && origResult.rows.length >= 10) {
        const netDebt = (data.debt - data.cash) / data.shares;
        const sb = origResult.rows[6].cum - netDebt;
        const bp = origResult.rows[9].cum - netDebt;
        setStrongBuyPrice(sb > 0 ? sb : null);
        setBuyPrice(bp > 0 ? bp : null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log(`✕ Error: ${msg}`);
      setError(msg);
    }
    setLoading(false);
    return paybackResult;
  };

  const rollDice = async () => {
    diceAbortRef.current = false;
    setRollingDice(true);
    setError("");
    const MAX_ATTEMPTS = 20;
    const DELAY_MS = 1000;
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    try {
      // Pre-filter pool using FMP screener + ETF intersection (single API call)
      console.log("[rollDice] filters:", rollFilters);
      const pool = await fetchFilteredPool(rollFilters);
      if (diceAbortRef.current) { setRollingDice(false); return; }
      console.log("[rollDice] pool size:", pool.length);
      if (pool.length === 0) {
        setError("No stocks match these filters — try widening your criteria.");
        setRollingDice(false);
        return;
      }
      // Fisher-Yates shuffle — no duplicate picks
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const limit = Math.min(MAX_ATTEMPTS, shuffled.length);
      for (let attempt = 0; attempt < limit; attempt++) {
        if (diceAbortRef.current) { setRollingDice(false); return; }
        if (attempt > 0) await wait(DELAY_MS);
        if (diceAbortRef.current) { setRollingDice(false); return; }
        const t = shuffled[attempt];
        try {
          console.log(`[rollDice] attempt ${attempt + 1}/${limit}: ${t}`);
          const data = await lookupTickerQuick(t);
          if (diceAbortRef.current) { setRollingDice(false); return; }
          const testInp: InputState = {
            marketCap: data.marketCap, debt: data.debt, cash: data.cash, shares: data.shares,
            ttmEPS: data.ttmEPS, forwardEPS: data.forwardEPS,
            historicalGrowth: data.historicalGrowth5yr, analystGrowth: data.analystGrowth,
            fwdGrowthY1: data.fwdGrowthY1, fwdGrowthY2: data.fwdGrowthY2, fwdCAGR: data.fwdCAGR,
            revenuePerShare: data.revenuePerShare, targetMargin: data.targetMargin,
            inceptionGrowth: data.inceptionGrowth, breakEvenYear: data.breakEvenYear,
            currentPrice: data.currentPrice, sma200: data.sma200,
            dividendYield: data.dividendYield || 0, operatingMargin: data.operatingMargin ?? null, lifecycleStage: data.lifecycleStage, growthOverrides: {}, decayMode: "ff",
          };
          const testResult = calcTUP(testInp, "standard");
          const pb = testResult?.payback;
          console.log(`[rollDice] ${t} payback=${pb}`);
          if (pb && matchesTupRange(pb, rollFilters.tupRange)) {
            if (diceAbortRef.current) { setRollingDice(false); return; }
            console.log(`[rollDice] MATCH ${t} — running full fetch`);
            setTicker(t);
            setIsFilterOpen(false);
            const fullPb = await doFetch(t);
            if (fullPb && matchesTupRange(fullPb, rollFilters.tupRange)) {
              setRollingDice(false);
              return;
            }
            console.log(`[rollDice] ${t} full-fetch payback=${fullPb} — diverged from quick estimate, skipping`);
          }
        } catch (err) {
          console.warn(`[rollDice] ${t} failed:`, err instanceof Error ? err.message : err);
        }
      }
      if (!diceAbortRef.current) setError("Could not find a suitable stock — try adjusting filters.");
    } catch (e) {
      if (!diceAbortRef.current) setError(e instanceof Error ? e.message : "Failed to roll dice.");
    }
    setRollingDice(false);
  };

  const resetSearch = () => {
    setHasSearched(false);
    setCompany("");
    setTicker("");
    setError("");
    setFetchLog([]);
    setPriceHistory([]);
    setGuruData(null);
  };

  // ─── URL param read on mount → auto-fetch if ticker present ───────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    if (t) {
      urlOverridesRef.current = {
        hg: params.has("hg") ? Number(params.get("hg")) : null,
        gp: params.get("gp") === "10yr" ? "10yr" : null,
      };
      setTicker(t.toUpperCase());
      doFetch(t.toUpperCase());
    } else if (import.meta.env.DEV) {
      setTicker(dev.DEV_TICKER);
      setCompany(dev.DEV_COMPANY);
      setMeta(dev.DEV_META);
      setInp(dev.DEV_INP);
      setValuation(dev.DEV_VALUATION);
      setScorecard({ cashFlows: dev.DEV_CASH_FLOWS, incomeHistory: dev.DEV_INCOME_HISTORY, epsGrowthHistory: dev.DEV_EPS_GROWTH_HISTORY, description: dev.DEV_DESCRIPTION });
      setGrowthValues(dev.DEV_GROWTH_VALUES);
      setGrowthYears(dev.DEV_GROWTH_YEARS);
      setScenarioValues({
        bear: dev.DEV_SCENARIO_VALUES.bear,
        base: dev.DEV_SCENARIO_VALUES.base,
        bull: dev.DEV_SCENARIO_VALUES.bull,
      });
      setHasSearched(true);
      const origResult = calcTUP(dev.DEV_INP, "standard");
      if (origResult && origResult.epsBase > 0 && origResult.gr > 0 && origResult.rows.length >= 10) {
        const netDebt = (dev.DEV_INP.debt - dev.DEV_INP.cash) / dev.DEV_INP.shares;
        const sb = origResult.rows[6].cum - netDebt;
        const bp = origResult.rows[9].cum - netDebt;
        setStrongBuyPrice(sb > 0 ? sb : null);
        setBuyPrice(bp > 0 ? bp : null);
      }
      // Build dev guru data from mock TickerData
      setGuruData(computeGuruData({
        ...dev.DEV_INP,
        companyName: dev.DEV_COMPANY,
        ticker: dev.DEV_TICKER,
        sector: dev.DEV_META.sector,
        industry: dev.DEV_META.industry,
        historicalGrowth: dev.DEV_GROWTH_VALUES.g10,
        historicalGrowth5yr: dev.DEV_GROWTH_VALUES.g5,
        epsYearsShort: dev.DEV_GROWTH_YEARS.short,
        epsYearsLong: dev.DEV_GROWTH_YEARS.long,
        analystGrowth: dev.DEV_INP.analystGrowth,
        fwdGrowthY1: dev.DEV_SCENARIO_VALUES.base.y1,
        fwdGrowthY2: dev.DEV_SCENARIO_VALUES.base.y2,
        fwdCAGR: dev.DEV_SCENARIO_VALUES.base.cagr,
        fwdGrowthY1Bear: dev.DEV_SCENARIO_VALUES.bear.y1,
        fwdGrowthY2Bear: dev.DEV_SCENARIO_VALUES.bear.y2,
        fwdCAGRBear: dev.DEV_SCENARIO_VALUES.bear.cagr,
        fwdGrowthY1Bull: dev.DEV_SCENARIO_VALUES.bull.y1,
        fwdGrowthY2Bull: dev.DEV_SCENARIO_VALUES.bull.y2,
        fwdCAGRBull: dev.DEV_SCENARIO_VALUES.bull.cagr,
        isConverted: false,
        currencyNote: "",
        currencyMismatchWarning: "",
        divNote: "",
        peterLynchRatio: null,
        piotroski: 7,
        cashFlowHistory: dev.DEV_CASH_FLOWS,
        incomeHistory: dev.DEV_INCOME_HISTORY,
        epsGrowthHistory: dev.DEV_EPS_GROWTH_HISTORY,
        description: dev.DEV_DESCRIPTION,
        exchange: "NASDAQ",
        priceHistory: [],
        ...dev.DEV_DERIVED_RATIOS,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── URL sync ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasSearched || !company) return;
    const params = new URLSearchParams();
    params.set("t", ticker.toUpperCase());
    const fetchedHg = growthPeriod === "5yr" ? growthValues.g5 : growthValues.g10;
    if (Math.round(inp.historicalGrowth * 10) !== Math.round(fetchedHg * 10)) {
      params.set("hg", String(Math.round(inp.historicalGrowth * 10) / 10));
    }
    if (growthPeriod === "10yr") {
      params.set("gp", "10yr");
    }
    history.replaceState(null, "", "?" + params.toString());
  }, [hasSearched, company, ticker, inp.historicalGrowth, growthPeriod, growthValues]);

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    // Search / dice UI
    ticker, setTicker, loading, error, fetchLog,
    rollingDice, dicePhrase,
    isFilterOpen, setIsFilterOpen, rollFilters, setRollFilters, hasActiveFilters,

    // Actions
    doFetch, rollDice, cancelDice, resetSearch,

    // Fetched data
    company, meta, isConverted, currencyNote, currencyMismatchWarning,
    valuation, scorecard, hasSearched,
    strongBuyPrice, buyPrice, guruData,

    // Shared mutable state
    inp, setInp,
    priceHistory,
    growthPeriod, setGrowthPeriod,
    growthScenario, setGrowthScenario,
    growthValues, growthYears,
    scenarioValues, hasScenarioData,
  };
}
