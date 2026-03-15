import { useState, useMemo, useEffect, useRef } from "react";

import { calcTUP } from "./lib/calcTUP.ts";
import { lookupTicker, lookupTickerQuick, fetchRandomTickerFiltered } from "./lib/api.ts";
import { C } from "./lib/theme.ts";
import { MKTCAP_RANGES } from "./lib/constants.ts";
import type { InputState, Mode, TUPResult, GrowthScenario, RollFilters, FMPEarningSurprise, FMPCashFlow, FMPIncomeStatement } from "./lib/types.ts";

import { VerdictCard } from "./components/VerdictCard.tsx";
import { ValuationContext } from "./components/ValuationContext.tsx";
import { CompanyScorecard } from "./components/CompanyScorecard.tsx";
import { Table } from "./components/Table.tsx";
import { MethodologyPage } from "./components/MethodologyPage.tsx";
import { Masthead } from "./components/Masthead.tsx";
import { HeroSearch } from "./components/HeroSearch.tsx";
import { CompactTickerBar } from "./components/CompactTickerBar.tsx";
import { DataSections } from "./components/DataSections.tsx";
import * as dev from "./lib/devData.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

interface ValuationState {
  dcf: number | null;
  altmanZ: number | null;
}

interface ScorecardState {
  earnings: FMPEarningSurprise[];
  cashFlows: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
  description: string;
  exchange: string;
}

export default function App() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchLog, setFetchLog] = useState<string[]>([]);
  const mode: Mode = "standard";
  const [rollingDice, setRollingDice] = useState(false);
  const DICE_PHRASES = ["Rolling...", "Shuffling...", "Mapping...", "Hoping...", "Pondering...", "Sifting...", "Summing...", "Casting...", "Manifesting..."];
  const [dicePhrase, setDicePhrase] = useState(DICE_PHRASES[0]);
  useEffect(() => {
    if (!rollingDice) { setDicePhrase(DICE_PHRASES[0]); return; }
    let idx = 0;
    const iv = setInterval(() => { idx = (idx + 1) % DICE_PHRASES.length; setDicePhrase(DICE_PHRASES[idx]); }, 2000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollingDice]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rollFilters, setRollFilters] = useState<RollFilters>({ marketCap: "All", sector: "", exchange: "All", indexEtf: "" });
  const hasActiveFilters = rollFilters.marketCap !== "All" || rollFilters.sector !== "" || rollFilters.exchange !== "All" || rollFilters.indexEtf !== "";
  const [showMethodology, setShowMethodology] = useState(false);
  const [company, setCompany] = useState("");
  const [meta, setMeta] = useState<{ sector: string; industry: string }>({ sector: "", industry: "" });
  const [isConverted, setIsConverted] = useState(false);
  const [currencyNote, setCurrencyNote] = useState("");
  const [currencyMismatchWarning, setCurrencyMismatchWarning] = useState("");
  const [valuation, setValuation] = useState<ValuationState>({ dcf: null, altmanZ: null });
  const [scorecard, setScorecard] = useState<ScorecardState>({ earnings: [], cashFlows: [], incomeHistory: [], description: "", exchange: "" });

  const [hasSearched, setHasSearched] = useState(false);

  const [inp, setInp] = useState<InputState>({
    marketCap: 0, debt: 0, cash: 0, shares: 1,
    ttmEPS: 0, forwardEPS: 0, historicalGrowth: 10, analystGrowth: 10, fwdGrowthY1: 10, fwdGrowthY2: null, fwdCAGR: null,
    revenuePerShare: 0, targetMargin: 15, inceptionGrowth: 30, breakEvenYear: 2,
    currentPrice: 0, sma200: 0, dividendYield: 0, lifecycleStage: null, growthOverrides: {}, vdrEnabled: true,
  });

  const result: TUPResult | null = useMemo(() => calcTUP(inp, mode), [inp, mode]);

  const [strongBuyPrice, setStrongBuyPrice] = useState<number | null>(null);
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<"5yr" | "10yr">("5yr");
  const [growthValues, setGrowthValues] = useState<{ g5: number; g10: number }>({ g5: 10, g10: 10 });
  const [growthScenario, setGrowthScenario] = useState<GrowthScenario>("base");
  const [scenarioValues, setScenarioValues] = useState<Record<GrowthScenario, { y1: number; y2: number | null; cagr: number | null }>>({
    bear: { y1: 0, y2: null, cagr: null },
    base: { y1: 0, y2: null, cagr: null },
    bull: { y1: 0, y2: null, cagr: null },
  });
  const hasScenarioData = scenarioValues.bear.y1 !== 0 || scenarioValues.bull.y1 !== 0;
  const urlOverridesRef = useRef<{ hg: number | null; gp: "10yr" | null } | null>(null);

  const onScenarioChange = (s: GrowthScenario) => {
    setGrowthScenario(s);
    const v = scenarioValues[s];
    setInp(p => ({ ...p, fwdGrowthY1: v.y1, fwdGrowthY2: v.y2, fwdCAGR: v.cagr, growthOverrides: {} }));
  };

  const rollDice = async () => {
    setRollingDice(true);
    setError("");
    const MAX_ATTEMPTS = 100;
    const DELAY_MS = 2000;
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) await wait(DELAY_MS);
        const t = await fetchRandomTickerFiltered(rollFilters.indexEtf);
        try {
          const data = await lookupTickerQuick(t);
          // Market cap filter
          if (rollFilters.marketCap !== "All") {
            const range = MKTCAP_RANGES[rollFilters.marketCap];
            if (data.marketCap < range.min || data.marketCap >= range.max) continue;
          }
          // Sector filter
          if (rollFilters.sector && data.sector !== rollFilters.sector) continue;
          // Exchange filter
          if (rollFilters.exchange !== "All") {
            const ex = data.exchange.toUpperCase();
            if (rollFilters.exchange === "NYSE" && ex !== "NYSE" && ex !== "AMEX" && ex !== "NYSEAMERICAN") continue;
            if (rollFilters.exchange === "NASDAQ" && ex !== "NASDAQ") continue;
            if (rollFilters.exchange === "OTC" && ex !== "OTC") continue;
            if (rollFilters.exchange === "LSE" && ex !== "LSE") continue;
            if (rollFilters.exchange === "TSX" && ex !== "TSX" && ex !== "TSXV") continue;
          }
          const testInp: InputState = {
            marketCap: data.marketCap, debt: data.debt, cash: data.cash, shares: data.shares,
            ttmEPS: data.ttmEPS, forwardEPS: data.forwardEPS,
            historicalGrowth: data.historicalGrowth5yr, analystGrowth: data.analystGrowth,
            fwdGrowthY1: data.fwdGrowthY1, fwdGrowthY2: data.fwdGrowthY2, fwdCAGR: data.fwdCAGR,
            revenuePerShare: data.revenuePerShare, targetMargin: data.targetMargin,
            inceptionGrowth: data.inceptionGrowth, breakEvenYear: data.breakEvenYear,
            currentPrice: data.currentPrice, sma200: data.sma200,
            dividendYield: data.dividendYield || 0, lifecycleStage: data.lifecycleStage, growthOverrides: {}, vdrEnabled: true,
          };
          const testResult = calcTUP(testInp, "standard");
          const pb = testResult?.payback;
          if (pb && pb > 4 && pb < 18) {
            setTicker(t);
            await doFetch(t);
            setRollingDice(false);
            return;
          }
        } catch {
          // Skip tickers that fail to fetch
        }
      }
      setError("Could not find a suitable stock — try adjusting filters.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to roll dice.");
    }
    setRollingDice(false);
  };

  const doFetch = async (tickerOverride?: string) => {
    const t = (tickerOverride || ticker).trim().toUpperCase();
    if (!t) { setError("Enter a ticker symbol."); return; }
    setLoading(true); setError(""); setFetchLog([]); setIsConverted(false); setCurrencyNote(""); setCurrencyMismatchWarning(""); setValuation({ dcf: null, altmanZ: null }); setScorecard({ earnings: [], cashFlows: [], incomeHistory: [], description: "", exchange: "" }); setStrongBuyPrice(null); setBuyPrice(null); setHasSearched(true);

    const log = (msg: string) => setFetchLog(p => [...p, msg]);
    try {
      const data = await lookupTicker(t, log);

      setCompany(data.companyName);
      setMeta({ sector: data.sector, industry: data.industry });
      setIsConverted(data.isConverted || false);
      setCurrencyNote(data.currencyNote || "");
      setCurrencyMismatchWarning(data.currencyMismatchWarning || "");
      setValuation({ dcf: data.dcfValue, altmanZ: data.altmanZ });
      setScorecard({ earnings: data.earningsSurprises, cashFlows: data.cashFlowHistory, incomeHistory: data.incomeHistory, description: data.description, exchange: data.exchange });

      setGrowthValues({ g5: data.historicalGrowth5yr, g10: data.historicalGrowth });
      setGrowthScenario("base");
      setScenarioValues({
        bear: { y1: data.fwdGrowthY1Bear ?? 0, y2: data.fwdGrowthY2Bear, cagr: data.fwdCAGRBear },
        base: { y1: data.fwdGrowthY1, y2: data.fwdGrowthY2, cagr: data.fwdCAGR },
        bull: { y1: data.fwdGrowthY1Bull ?? 0, y2: data.fwdGrowthY2Bull, cagr: data.fwdCAGRBull },
      });
      let finalGrowthPeriod: "5yr" | "10yr" = "5yr";
      const origInp = {
        marketCap: data.marketCap, debt: data.debt, cash: data.cash, shares: data.shares,
        ttmEPS: data.ttmEPS, forwardEPS: data.forwardEPS,
        historicalGrowth: data.historicalGrowth5yr, analystGrowth: data.analystGrowth,
        fwdGrowthY1: data.fwdGrowthY1, fwdGrowthY2: data.fwdGrowthY2, fwdCAGR: data.fwdCAGR,
        revenuePerShare: data.revenuePerShare, targetMargin: data.targetMargin,
        inceptionGrowth: data.inceptionGrowth, breakEvenYear: data.breakEvenYear,
        currentPrice: data.currentPrice, sma200: data.sma200,
        dividendYield: data.dividendYield || 0, lifecycleStage: data.lifecycleStage, growthOverrides: {}, vdrEnabled: true,
      };
      let finalInp = origInp;
      const overrides = urlOverridesRef.current;
      if (overrides) {
        if (overrides.gp === "10yr") {
          finalGrowthPeriod = "10yr";
          finalInp = { ...finalInp, historicalGrowth: data.historicalGrowth };
        }
        if (overrides.hg !== null) finalInp = { ...finalInp, historicalGrowth: overrides.hg };
        urlOverridesRef.current = null;
      }
      setGrowthPeriod(finalGrowthPeriod);
      setInp(finalInp);

      // Compute fixed target prices using conservative 30%-capped growth
      const origResult = calcTUP(origInp, "standard");
      if (origResult && origResult.epsBase > 0 && origResult.gr > 0) {
        const netDebt = (data.debt - data.cash) / data.shares;
        const cappedGr = Math.min(origResult.gr, 0.30);
        const cumAt = (years: number) => {
          let cum = 0, eps = origResult.epsBase;
          for (let y = 1; y <= years; y++) {
            eps *= (1 + cappedGr);
            cum += eps;
          }
          return cum - netDebt;
        };
        const sb = cumAt(7);
        const bp = cumAt(10);
        setStrongBuyPrice(sb > 0 ? sb : null);
        setBuyPrice(bp > 0 ? bp : null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      log(`✕ Error: ${msg}`);
      setError(msg);
    }
    setLoading(false);
  };

  // Read URL params on mount → auto-fetch if ticker present
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setScorecard({ earnings: dev.DEV_EARNINGS, cashFlows: dev.DEV_CASH_FLOWS, incomeHistory: dev.DEV_INCOME_HISTORY, description: dev.DEV_DESCRIPTION, exchange: "NASDAQ" });
      setGrowthValues(dev.DEV_GROWTH_VALUES);
      setScenarioValues({
        bear: dev.DEV_SCENARIO_VALUES.bear,
        base: dev.DEV_SCENARIO_VALUES.base,
        bull: dev.DEV_SCENARIO_VALUES.bull,
      });
      setHasSearched(true);
      const origResult = calcTUP(dev.DEV_INP, "standard");
      if (origResult && origResult.epsBase > 0 && origResult.gr > 0) {
        const netDebt = (dev.DEV_INP.debt - dev.DEV_INP.cash) / dev.DEV_INP.shares;
        const cappedGr = Math.min(origResult.gr, 0.30);
        const cumAt = (years: number) => {
          let cum = 0, eps = origResult.epsBase;
          for (let y = 1; y <= years; y++) { eps *= (1 + cappedGr); cum += eps; }
          return cum - netDebt;
        };
        setStrongBuyPrice(cumAt(7) > 0 ? cumAt(7) : null);
        setBuyPrice(cumAt(10) > 0 ? cumAt(10) : null);
      }
    }
  }, []);

  // Keep URL in sync with current ticker + growth overrides
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

  if (showMethodology) return <MethodologyPage onBack={() => setShowMethodology(false)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: C.body, boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Barlow+Condensed:wght@400;700;900&family=Space+Grotesk:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <div className="rsp-container" style={{ margin: "0 auto", padding: "0 24px" }}>

        <Masthead
          company={company}
          meta={meta}
          isConverted={isConverted}
          currencyNote={currencyNote}
          onShowMethodology={() => { setShowMethodology(true); window.scrollTo(0, 0); }}
        />

        {!hasSearched && (
          <HeroSearch
            ticker={ticker}
            onTickerChange={setTicker}
            onTickerSelect={setTicker}
            onFetch={doFetch}
            loading={loading}
            error={error}
            onRollDice={rollDice}
            rollingDice={rollingDice}
            dicePhrase={dicePhrase}
            isFilterOpen={isFilterOpen}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            rollFilters={rollFilters}
            onApplyFilters={setRollFilters}
            onResetFilters={() => setRollFilters({ marketCap: "All", sector: "", exchange: "All", indexEtf: "" })}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {hasSearched && (<>
          <CompactTickerBar
            ticker={ticker}
            onTickerChange={setTicker}
            onTickerSelect={setTicker}
            onFetch={doFetch}
            loading={loading}
            error={error}
            fetchLog={fetchLog}
            onRollDice={rollDice}
            rollingDice={rollingDice}
            dicePhrase={dicePhrase}
            isFilterOpen={isFilterOpen}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            rollFilters={rollFilters}
            onApplyFilters={setRollFilters}
            onResetFilters={() => setRollFilters({ marketCap: "All", sector: "", exchange: "All", indexEtf: "" })}
            hasActiveFilters={hasActiveFilters}
          />
        </>)}

        {hasSearched && (<>
        <div className="rsp-main-grid" style={{ display: "grid", gridTemplateColumns: "3fr 2px 2fr", gridTemplateRows: "auto 2px auto", gap: "0", minHeight: "600px", alignItems: "start" }}>

          {/* Left column top: Verdict */}
          <div className="rsp-left-verdict" style={{ paddingLeft: "40px", paddingRight: "40px", paddingTop: "28px", paddingBottom: "28px", animation: "fadeInUp 0.5s 0.15s ease both" }}>

            {hasSearched && !company && (
              <div style={{ paddingTop: "48px" }}>
                <div style={{ fontFamily: C.serif, color: C.accent, fontSize: "28px", marginBottom: "16px", lineHeight: 1 }}>→</div>
                <p style={{ fontSize: "11px", color: "#505050", lineHeight: 1.9, margin: 0 }}>
                  Enter a ticker above<br />and click Fetch Data —<br />all values load automatically.
                </p>
              </div>
            )}

            <VerdictCard result={result} noiseFilter={false} currentPrice={inp.currentPrice}
              growthScenario={growthScenario}
              onScenarioChange={onScenarioChange}
              hasScenarioData={hasScenarioData}
              onGrowthStep={(d: number) => {
              setGrowthScenario("base");
              setInp(p => ({
                ...p,
                historicalGrowth: Math.max(0, p.historicalGrowth + d),
                analystGrowth: Math.max(0, p.analystGrowth + d),
                fwdGrowthY1: Math.max(0, p.fwdGrowthY1 + d),
                fwdGrowthY2: p.fwdGrowthY2 != null ? Math.max(0, p.fwdGrowthY2 + d) : null,
                fwdCAGR: p.fwdCAGR != null ? Math.max(0, p.fwdCAGR + d) : null,
                growthOverrides: {},
              }));
            }} />

          </div>

          {/* Left column bottom: Data sections */}
          <div className="rsp-left-data" style={{ paddingRight: "40px", paddingTop: "28px", paddingBottom: "40px", animation: "fadeInUp 0.5s 0.15s ease both" }}>

            <DataSections
              inp={inp}
              company={company}
              currencyMismatchWarning={currencyMismatchWarning}
              growthPeriod={growthPeriod}
              growthValues={growthValues}
              onGrowthPeriodChange={p => {
                setGrowthPeriod(p);
                setInp(prev => ({ ...prev, historicalGrowth: p === "5yr" ? growthValues.g5 : growthValues.g10, growthOverrides: {} }));
              }}
            />

          </div>

          {/* Hairline vertical rule */}
          <div className="rsp-hairline-v" style={{ background: C.border, width: "2px" }} />

          {/* Hairline horizontal rule */}
          <div className="rsp-hairline-h" style={{ background: C.border, height: "2px" }} />

          {/* Right column top: Valuation + Scorecard */}
          <div className="rsp-right-top" style={{ paddingLeft: "40px", paddingTop: "12px", paddingBottom: "28px", animation: "fadeInUp 0.5s 0.2s ease both" }}>
            <ValuationContext
              strongBuyPrice={strongBuyPrice}
              buyPrice={buyPrice}
              dcf={valuation.dcf}
              currentPrice={inp.currentPrice}
              altmanZ={valuation.altmanZ}
            />
            {company && (
              <CompanyScorecard
                earnings={scorecard.earnings}
                cashFlows={scorecard.cashFlows}
                incomeHistory={scorecard.incomeHistory}
                description={scorecard.description}
                exchange={scorecard.exchange}
                lifecycleOnly
              />
            )}
          </div>

          {/* Right column bottom: Table */}
          <div className="rsp-right-bottom" style={{ paddingLeft: "40px", paddingTop: "28px", paddingBottom: "40px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C4A06E", fontSize: "14px", letterSpacing: "0.05em", fontWeight: 700 }}>04</span>
                <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888" }}>Year-by-Year Breakdown</span>
                <button onClick={() => setInp(p => ({ ...p, vdrEnabled: !p.vdrEnabled }))} style={{
                  fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.05em", padding: "2px 6px",
                  background: inp.vdrEnabled ? "rgba(196,160,110,0.2)" : "transparent",
                  border: `1px solid ${inp.vdrEnabled ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                  color: inp.vdrEnabled ? "#C4A06E" : "#666",
                  cursor: "pointer", borderRadius: "3px",
                }}>VDR</button>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
              </div>
              <Table result={result} growthOverrides={inp.growthOverrides} onGrowthChange={(year, val) => {
                setInp(p => {
                  const overrides = { ...p.growthOverrides };
                  for (let y = year; y <= 30; y++) overrides[y] = val;
                  return { ...p, growthOverrides: overrides };
                });
              }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}`, paddingBottom: "32px" }}>
          <p style={{ fontSize: "10px", color: C.text3, margin: 0, textAlign: "center" }}>
            TUP Calculator — For educational purposes only. Not financial advice. Data via Financial Modeling Prep API.
          </p>
        </footer>
        </>)}

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroGlow {
          0%, 100% { box-shadow: 0 0 0px rgba(196,160,110,0); border-color: #C4A06E; }
          50%       { box-shadow: 0 0 18px rgba(196,160,110,0.35), 0 0 40px rgba(196,160,110,0.12); border-color: #d4b882; }
        }

        /* ── Desktop grid placement for 2×2 layout ──────────────────── */
        .rsp-left-verdict { grid-column: 1; grid-row: 1; }
        .rsp-left-data    { grid-column: 1; grid-row: 3; }
        .rsp-hairline-v   { grid-column: 2; grid-row: 1 / span 3; }
        .rsp-hairline-h   { grid-column: 1 / span 3; grid-row: 2; }
        .rsp-right-top    { grid-column: 3; grid-row: 1; }
        .rsp-right-bottom { grid-column: 3; grid-row: 3; }

        /* Desktop: verdict text scaled */
        @media (min-width: 768px) {
          .rsp-verdict-num   { font-size: clamp(7.5rem, 21vw, 13.5rem) !important; }
          .rsp-verdict-label { font-size: 25px !important; }
          .rsp-verdict-sub   { font-size: 12px !important; }
        }

        /* Desktop: noise filter first, methodology second */
        .rsp-methodology-btn { order: 1; }

        /* ── Mobile (< 768px) ─────────────────────────────────────────────── */
        @media (max-width: 767px) {
          .rsp-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          .rsp-verdict-num   { font-size: clamp(5.5rem, 22vw, 8rem) !important; }
          .rsp-hero-section {
            padding-bottom: 120px !important;
          }
          .rsp-hero-row {
            flex-direction: column !important;
          }
          .rsp-hero-btn {
            border-left: none !important;
            border-top: 2px solid rgba(196,160,110,0.4) !important;
            width: 100% !important;
          }
          .rsp-header {
            flex-direction: column;
            gap: 12px;
          }
          .rsp-header-toggles {
            flex-shrink: unset;
            padding-top: 0;
            flex-wrap: wrap;
          }
          .rsp-methodology-btn { order: 0 !important; }
          .rsp-api-bar {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .rsp-api-bar-btn {
            width: 100%;
          }
          .rsp-api-bar-btn button:first-child {
            flex: 2 !important;
          }
          .rsp-api-bar-btn button:nth-child(2) {
            flex: 1 !important;
          }
          .rsp-api-bar-btn button:nth-child(3) {
            flex: 0 0 32px !important;
            width: 32px !important;
            min-width: 32px !important;
            padding: 0 !important;
          }
          .rsp-main-grid {
            display: flex !important;
            flex-direction: column !important;
            min-height: unset !important;
            align-items: stretch !important;
          }
          .rsp-hairline-v, .rsp-hairline-h {
            display: none !important;
          }
          .rsp-ticker-bar {
            padding-bottom: 12px !important;
            margin-bottom: 4px !important;
          }
          .rsp-left-verdict {
            order: 1;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0px !important;
          }
          .rsp-right-top {
            order: 2;
            padding-left: 0 !important;
            padding-bottom: 24px;
            border-top: 1px solid rgba(255,255,255,0.06);
          }
          .rsp-left-data {
            order: 3;
            padding-right: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding-top: 28px;
          }
          .rsp-right-bottom {
            order: 4;
            padding-left: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding-top: 28px;
          }
          .rsp-val-panel { padding-left: 8px !important; padding-right: 8px !important; }
          .rsp-val-panel:first-child { padding-left: 0 !important; }
          .rsp-val-panel .rsp-val-title { min-height: 26px; }
          .rsp-two-col {
            grid-template-columns: 1fr !important;
          }
          .rsp-dice-filter-wrap {
            max-height: 400px !important;
          }
          .rsp-dice-filter {
            flex-direction: column !important;
            align-items: flex-end !important;
            gap: 12px !important;
            padding-right: 8px !important;
          }
          .rsp-dice-filter > div > div:first-child {
            text-align: right !important;
          }
          .rsp-dice-filter input[type="text"] {
            text-align: right !important;
          }
        }

        /* ── Tablet (768px – 1023px) ──────────────────────────────────────── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .rsp-left-verdict  { padding-right: 24px !important; }
          .rsp-left-data     { padding-right: 24px !important; }
          .rsp-right-top     { padding-left: 24px !important; }
          .rsp-right-bottom  { padding-left: 24px !important; }
          .rsp-api-bar {
            grid-template-columns: 1fr 120px auto !important;
          }
        }
      `}</style>
    </div>
  );
}
