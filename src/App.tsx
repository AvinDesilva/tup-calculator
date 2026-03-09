import { useState, useCallback, useMemo, useRef } from "react";
import type React from "react";

import { calcTUP } from "./lib/calcTUP.ts";
import { lookupTicker } from "./lib/api.ts";
import { f, fB } from "./lib/utils.ts";
import type { InputState, Mode, TUPResult, FMPEarningSurprise, FMPCashFlow, FMPIncomeStatement, FMPGradesConsensus } from "./lib/types.ts";

import { SectionLabel, DataRow, DerivedStat } from "./components/ui.tsx";
import { VerdictCard } from "./components/VerdictCard.tsx";
import { ValuationContext } from "./components/ValuationContext.tsx";
import { CompanyScorecard } from "./components/CompanyScorecard.tsx";
import { Table } from "./components/Table.tsx";
import { MethodologyPage } from "./components/MethodologyPage.tsx";
import { TickerSearch } from "./components/TickerSearch.tsx";

// ═══════════════════════════════════════════════════════════════════════════════
// HOLD-TO-REPEAT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useHoldRepeat(callback: () => void, delay = 400, interval = 80) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iv    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const stop = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (iv.current)    { clearInterval(iv.current);   iv.current = null; }
  }, []);

  const start = useCallback(() => {
    cbRef.current();
    timer.current = setTimeout(() => {
      iv.current = setInterval(() => cbRef.current(), interval);
    }, delay);
  }, [delay, interval]);

  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOLD BUTTON — single arrow with hold-to-repeat
// ═══════════════════════════════════════════════════════════════════════════════

function HoldButton({ onStep, children, style }: {
  onStep: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const hold = useHoldRepeat(onStep);
  return (
    <button
      {...hold}
      onClick={e => e.preventDefault()}
      style={{
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEPPER ROW — ▼ value ▲ for editable numeric fields (hold-to-repeat)
// ═══════════════════════════════════════════════════════════════════════════════

function StepperRow({ label, value, onStep, badge, stepSize = 1, suffix = "%" }: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  badge?: React.ReactNode;
  stepSize?: number;
  suffix?: string;
}) {
  const btnStyle: React.CSSProperties = {
    width: "22px", height: "22px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
    color: "#e8e4dc", cursor: "pointer", fontSize: "10px",
    fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, lineHeight: 1,
    userSelect: "none",
    WebkitTouchCallout: "none",
    WebkitTapHighlightColor: "transparent",
  };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
        {badge}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <HoldButton onStep={() => onStep(-stepSize)} style={btnStyle}>▼</HoldButton>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5", minWidth: "52px", textAlign: "center" }}>
          {value.toFixed(1)}{suffix}
        </span>
        <HoldButton onStep={() => onStep(stepSize)} style={btnStyle}>▲</HoldButton>
      </div>
    </div>
  );
}

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
}

interface AnalystState {
  grades: FMPGradesConsensus | null;
  estimateSpread: { epsLow: number; epsAvg: number; epsHigh: number; numAnalysts: number } | null;
}

export default function App() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchLog, setFetchLog] = useState<string[]>([]);
  const mode: Mode = "standard";
  const [noiseFilter, setNoiseFilter] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [company, setCompany] = useState("");
  const [meta, setMeta] = useState<{ sector: string; industry: string }>({ sector: "", industry: "" });
  const [isConverted, setIsConverted] = useState(false);
  const [currencyNote, setCurrencyNote] = useState("");
  const [currencyMismatchWarning, setCurrencyMismatchWarning] = useState("");
  const [valuation, setValuation] = useState<ValuationState>({ dcf: null, altmanZ: null });
  const [scorecard, setScorecard] = useState<ScorecardState>({ earnings: [], cashFlows: [], incomeHistory: [], description: "" });
  const [analystData, setAnalystData] = useState<AnalystState>({ grades: null, estimateSpread: null });
  const [hasSearched, setHasSearched] = useState(false);

  const [inp, setInp] = useState<InputState>({
    marketCap: 0, debt: 0, cash: 0, shares: 1,
    ttmEPS: 0, forwardEPS: 0, historicalGrowth: 10, analystGrowth: 10,
    revenuePerShare: 0, targetMargin: 15, inceptionGrowth: 30, breakEvenYear: 2,
    currentPrice: 0, sma200: 0, dividendYield: 0, lifecycleStage: null, growthOverrides: {},
  });

  const result: TUPResult | null = useMemo(() => calcTUP(inp, mode), [inp, mode]);

  const [strongBuyPrice, setStrongBuyPrice] = useState<number | null>(null);
  const [buyPrice, setBuyPrice] = useState<number | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<"5yr" | "10yr">("5yr");
  const [growthValues, setGrowthValues] = useState<{ g5: number; g10: number }>({ g5: 10, g10: 10 });

  const doFetch = async () => {
    if (!ticker.trim()) { setError("Enter a ticker symbol."); return; }
    setLoading(true); setError(""); setFetchLog([]); setIsConverted(false); setCurrencyNote(""); setCurrencyMismatchWarning(""); setValuation({ dcf: null, altmanZ: null }); setScorecard({ earnings: [], cashFlows: [], incomeHistory: [], description: "" }); setAnalystData({ grades: null, estimateSpread: null }); setStrongBuyPrice(null); setBuyPrice(null); setHasSearched(true);

    const log = (msg: string) => setFetchLog(p => [...p, msg]);
    try {
      const data = await lookupTicker(ticker.toUpperCase(), log);

      setCompany(data.companyName);
      setMeta({ sector: data.sector, industry: data.industry });
      setIsConverted(data.isConverted || false);
      setCurrencyNote(data.currencyNote || "");
      setCurrencyMismatchWarning(data.currencyMismatchWarning || "");
      setValuation({ dcf: data.dcfValue, altmanZ: data.altmanZ });
      setScorecard({ earnings: data.earningsSurprises, cashFlows: data.cashFlowHistory, incomeHistory: data.incomeHistory, description: data.description });
      setAnalystData({ grades: data.gradesConsensus, estimateSpread: data.estimateSpread });
      setGrowthValues({ g5: data.historicalGrowth5yr, g10: data.historicalGrowth });
      setGrowthPeriod("5yr");
      const origInp = {
        marketCap: data.marketCap, debt: data.debt, cash: data.cash, shares: data.shares,
        ttmEPS: data.ttmEPS, forwardEPS: data.forwardEPS,
        historicalGrowth: data.historicalGrowth5yr, analystGrowth: data.analystGrowth,
        revenuePerShare: data.revenuePerShare, targetMargin: data.targetMargin,
        inceptionGrowth: data.inceptionGrowth, breakEvenYear: data.breakEvenYear,
        currentPrice: data.currentPrice, sma200: data.sma200,
        dividendYield: data.dividendYield || 0, lifecycleStage: data.lifecycleStage, growthOverrides: {},
      };
      setInp(origInp);

      // Compute fixed target prices using conservative 30%-capped growth
      const origResult = calcTUP(origInp, "standard");
      if (origResult && origResult.epsBase > 0 && origResult.gr > 0) {
        const netDebt = (data.debt - data.cash) / data.shares;
        const cappedGr = Math.min(origResult.gr, 0.30);
        const cumAt = (years: number) => {
          let cum = 0, eps = origResult.epsBase;
          for (let y = 1; y <= years; y++) {
            if (y > 1) eps *= (1 + cappedGr);
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

  // Shared inline style tokens
  const C = {
    bg: "#080808",
    text1: "#e8e4dc",
    text2: "#888888",
    text3: "#505050",
    accent: "#C4A06E",
    accentAlt: "#00BFA5",
    borderWeak: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    mono: "'JetBrains Mono', monospace",
    display: "'Barlow Condensed', sans-serif",
    serif: "'DM Serif Display', serif",
    body: "'Space Grotesk', system-ui, sans-serif",
  };

  const inputShared: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${C.borderWeak}`,
    color: C.text1,
    fontFamily: C.mono,
    fontSize: "13px",
    outline: "none",
    width: "100%",
    paddingBottom: "6px",
    boxSizing: "border-box",
  };

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    border: `1px solid ${active ? C.accent : C.borderWeak}`,
    background: active ? C.accent : "transparent",
    color: active ? "#080808" : C.text2,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: C.body,
  });

  if (showMethodology) return <MethodologyPage onBack={() => setShowMethodology(false)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: C.body, boxSizing: "border-box" }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Barlow+Condensed:wght@400;700;900&family=Space+Grotesk:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <div className="rsp-container" style={{ margin: "0 auto", padding: "0 24px" }}>

        {/* ── MASTHEAD ─────────────────────────────────────────────────────── */}
        <header className="rsp-header" style={{
          paddingTop: "28px",
          paddingBottom: "20px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: `2px solid ${C.accent}`,
          animation: "fadeInUp 0.4s ease both",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <h1 style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: C.text1,
                margin: 0,
              }}>TUP</h1>
              <span style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: C.text2,
              }}>Calculator</span>
            </div>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text3, marginTop: "4px" }}>
              Time Until Payback — Stock Valuation Engine
            </div>
            {company && (
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", animation: "fadeInUp 0.3s ease both" }}>
                <span style={{ fontFamily: C.display, fontSize: "20px", fontWeight: 700, color: C.text1, letterSpacing: "0.04em", textTransform: "uppercase" }}>{company}</span>
                {meta.sector && (
                  <span style={{ fontSize: "10px", color: C.text2, letterSpacing: "0.05em" }}>{meta.sector} · {meta.industry}</span>
                )}
                {isConverted && (
                  <span title={currencyNote} style={{
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                    color: C.accent, border: `1px solid rgba(196,160,110,0.35)`, padding: "2px 7px",
                    cursor: "help", flexShrink: 0,
                  }}>
                    ↔ FX Normalized
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Mode toggles top-right */}
          <div className="rsp-header-toggles" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, paddingTop: "6px" }}>
            <button className="rsp-methodology-btn" onClick={() => { setShowMethodology(true); window.scrollTo(0, 0); }} style={toggleBtn(false)}>
              Read Methodology →
            </button>
            <button className="rsp-noise-btn" onClick={() => setNoiseFilter(!noiseFilter)} style={toggleBtn(noiseFilter)}>
              {noiseFilter ? "◉" : "○"} Noise Filter
            </button>
          </div>
        </header>

        {!hasSearched && (
        /* ── HERO SEARCH ─────────────────────────────────────────────────── */
        <section className="rsp-hero-section" style={{ padding: "0 0 96px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.5s 0.1s ease both" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: C.text3, marginBottom: "24px", marginTop: "24px" }}>
            Stock Valuation Engine
          </div>
          <h2 style={{
            fontFamily: C.serif,
            fontWeight: 400,
            fontSize: "clamp(2.6rem, 6vw, 4.2rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: C.text1,
            textAlign: "center",
            margin: "0 0 48px",
            maxWidth: "900px",
          }}>
            Search Any Company<br />to Calculate<br /><em style={{ color: C.accent }}>Time Until Payback</em>
          </h2>

          <div className="rsp-hero-row" style={{ position: "relative", width: "100%", maxWidth: "600px", display: "flex", gap: "0", border: `2px solid ${C.accent}`, animation: "heroGlow 2.4s ease-in-out infinite" }}>
            <TickerSearch
              value={ticker}
              onChange={setTicker}
              onSelect={setTicker}
              onSubmit={doFetch}
              placeholder="Search..."
              inputStyle={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "16px 20px",
                fontSize: "18px",
                fontFamily: C.mono,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.text1,
                outline: "none",
                minWidth: 0,
              }}
            />
            <button className="rsp-hero-btn" onClick={doFetch} disabled={loading} style={{
              padding: "16px 24px",
              background: C.accent,
              color: "#080808",
              border: "none",
              borderLeft: `2px solid ${C.accent}`,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: C.body,
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              whiteSpace: "nowrap",
            }}>
              {loading ? (
                <>
                  <svg style={{ animation: "spin 1s linear infinite", width: "12px", height: "12px" }} viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Fetching…
                </>
              ) : "Calculate →"}
            </button>
          </div>

          {error && <div style={{ marginTop: "12px", fontSize: "11px", color: "#ff4136" }}>{error}</div>}

          <div style={{ marginTop: "20px", fontSize: "10px", color: C.text3, letterSpacing: "0.08em" }}>
            Search by company name or ticker · US, UK & Canadian markets
          </div>
        </section>
        )}

        {hasSearched && (<>
        {/* ── COMPACT TICKER BAR (post-search) ─────────────────────────────── */}
        <section style={{ paddingTop: "20px", paddingBottom: "20px", marginBottom: "20px", borderBottom: `1px solid ${C.borderWeak}`, animation: "fadeInUp 0.4s ease both" }}>
          <div className="rsp-api-bar" style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: "20px", alignItems: "end" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text2, flexShrink: 0 }}>Ticker</label>
              <TickerSearch
                value={ticker}
                onChange={setTicker}
                onSelect={setTicker}
                onSubmit={doFetch}
                placeholder="AAPL"
                inputStyle={{ ...inputShared, letterSpacing: "0.12em", textTransform: "uppercase" }}
                onFocus={e => (e.target.style.borderBottomColor = C.accent)}
                onBlur={e => (e.target.style.borderBottomColor = C.borderWeak)}
              />
            </div>
            <div className="rsp-api-bar-btn">
              <button onClick={doFetch} disabled={loading} style={{
                width: "100%",
                padding: "8px 16px",
                background: loading ? C.text3 : C.accent,
                color: "#080808",
                border: "none",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: C.body,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                transition: "opacity 0.15s",
              }}>
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite", width: "12px", height: "12px" }} viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Fetching...
                  </>
                ) : "Fetch Data →"}
              </button>
            </div>
            <div className="rsp-api-bar-status" style={{ fontSize: "11px", paddingBottom: "2px" }}>
              {error && <span style={{ color: "#ff4136" }}>{error}</span>}
            </div>
          </div>

          {fetchLog.some(m => m.startsWith("✕")) && (
            <div style={{ marginTop: "10px" }}>
              {fetchLog.filter(m => m.startsWith("✕")).map((msg, i) => (
                <div key={i} style={{ fontSize: "11px", color: "#ff4136", fontFamily: C.mono }}>{msg}</div>
              ))}
            </div>
          )}
        </section>
        </>)}

        {hasSearched && (<>
        {/* ── MAIN GRID: asymmetric 5:7 ────────────────────────────────────── */}
        <div className="rsp-main-grid" style={{ display: "grid", gridTemplateColumns: "5fr 2px 7fr", gap: "0", minHeight: "600px" }}>

          {/* ── LEFT COLUMN: Verdict + Data ─────────────────────────── */}
          <div className="rsp-left-col" style={{ paddingRight: "40px", paddingBottom: "40px", paddingTop: "28px", animation: "fadeInUp 0.5s 0.15s ease both" }}>

            {hasSearched && !company && (
              <div style={{ paddingTop: "48px" }}>
                <div style={{ fontFamily: C.serif, color: C.accent, fontSize: "28px", marginBottom: "16px", lineHeight: 1 }}>→</div>
                <p style={{ fontSize: "11px", color: "#505050", lineHeight: 1.9, margin: 0 }}>
                  Enter a ticker above<br />and click Fetch Data —<br />all values load automatically.
                </p>
              </div>
            )}

            <VerdictCard result={result} mode={mode} noiseFilter={noiseFilter} currentPrice={inp.currentPrice} onGrowthStep={(d: number) => {
              setInp(p => ({
                ...p,
                historicalGrowth: Math.max(0, p.historicalGrowth + d),
                analystGrowth: Math.max(0, p.analystGrowth + d),
                growthOverrides: {},
              }));
            }} />

            {/* 01 Enterprise Value */}
            <div style={{ marginBottom: "32px" }}>
              <SectionLabel num="01" title="Enterprise Value" />
              {currencyMismatchWarning && (
                <div style={{ marginBottom: "12px", padding: "8px 12px", borderLeft: "2px solid #f5a020", background: "rgba(245,160,32,0.04)", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ color: "#f5a020", flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: "10px", color: "#f5a020", lineHeight: 1.6 }}>{currencyMismatchWarning}</span>
                </div>
              )}
              <DataRow label="Market Cap"         value={company ? fB(inp.marketCap) : "—"} />
              <DataRow label="Total Debt"         value={company ? fB(inp.debt) : "—"} />
              <DataRow label="Cash & Equiv."      value={company ? fB(inp.cash) : "—"} />
              <DataRow label="Shares Outstanding" value={company ? `${(inp.shares / 1e9).toFixed(3)}B` : "—"} />
              {company && (
                <DerivedStat
                  label="Adj. Price = (MktCap + Debt − Cash) ÷ Shares"
                  value={`$${f((inp.marketCap + inp.debt - inp.cash) / inp.shares)}`}
                />
              )}
            </div>

            {/* 02 Earnings */}
            <div style={{ marginBottom: "32px" }}>
              <SectionLabel num="02" title="Earnings" />
              <DataRow label="TTM EPS"            value={company ? `$${f(inp.ttmEPS)}` : "—"} />
              <DataRow label="Forward EPS (est.)" value={company ? `$${f(inp.forwardEPS)}` : "—"} />
              {company && <DerivedStat label="Blended EPS = Avg(TTM, Forward)" value={`$${f((inp.ttmEPS + inp.forwardEPS) / 2)}`} />}
            </div>

            {/* 03 Growth */}
            <div style={{ marginBottom: "32px" }}>
              <SectionLabel num="03" title="Growth Assumptions" />
              {(() => {
                const blended = (inp.historicalGrowth + inp.analystGrowth) / 2;
                const divYield = inp.dividendYield || 0;
                const divIsAccelerator = divYield > 3;
                return (
                  <>
                    <StepperRow
                      label="Historical EPS Growth"
                      value={inp.historicalGrowth}
                      onStep={d => setInp(prev => ({ ...prev, historicalGrowth: Math.max(0, prev.historicalGrowth + d), growthOverrides: {} }))}
                      badge={
                        <div style={{ display: "flex", gap: "0px" }}>
                          {(["5yr", "10yr"] as const).map(p => (
                            <button key={p} onClick={() => {
                              setGrowthPeriod(p);
                              setInp(prev => ({ ...prev, historicalGrowth: p === "5yr" ? growthValues.g5 : growthValues.g10, growthOverrides: {} }));
                            }} style={{
                              fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: "0.05em", padding: "2px 6px",
                              background: growthPeriod === p ? "rgba(196,160,110,0.2)" : "transparent",
                              border: `1px solid ${growthPeriod === p ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                              color: growthPeriod === p ? "#C4A06E" : "#666",
                              cursor: "pointer",
                              borderRadius: p === "5yr" ? "3px 0 0 3px" : "0 3px 3px 0",
                              marginLeft: p === "10yr" ? "-1px" : 0,
                            }}>{p}</button>
                          ))}
                        </div>
                      }
                    />
                    <StepperRow
                      label="Analyst Forward Growth (2yr)"
                      value={inp.analystGrowth}
                      onStep={d => setInp(prev => ({ ...prev, analystGrowth: Math.max(0, prev.analystGrowth + d), growthOverrides: {} }))}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>Dividend Yield</span>
                        {divIsAccelerator && (
                          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#10d97e", border: "1px solid rgba(16,217,126,0.3)", padding: "1px 5px" }}>
                            ★ Accelerator
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5" }}>
                        {divYield.toFixed(1)}%
                      </span>
                    </div>
                    <DerivedStat label="Blended Growth Rate" value={`${f(blended)}%`} accent="#10d97e" />
                    {divYield > 0 && (
                      <DerivedStat
                        label="Total TUP Growth Rate"
                        value={`(${f(blended)}% + ${f(divYield)}%) = ${f(blended + divYield)}%`}
                        accent="#C4A06E"
                      />
                    )}
                  </>
                );
              })()}
            </div>

            {/* 04 Technical */}
            <div>
              <SectionLabel num="04" title="Technical Validation" />
              <DataRow label="Current Price" value={company ? `$${f(inp.currentPrice)}` : "—"} />
              <DataRow label="200-Day SMA"   value={company ? `$${f(inp.sma200)}` : "—"} />
              {company && inp.currentPrice > 0 && inp.sma200 > 0 && (
                <div style={{
                  padding: "8px 12px",
                  borderLeft: `2px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.5)" : "rgba(255,65,54,0.5)"}`,
                  borderTop: `1px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.12)" : "rgba(255,65,54,0.12)"}`,
                  borderRight: `1px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.12)" : "rgba(255,65,54,0.12)"}`,
                  borderBottom: `1px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.12)" : "rgba(255,65,54,0.12)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "10px",
                }}>
                  <span style={{ color: inp.currentPrice >= inp.sma200 ? "#10d97e" : "#ff4136" }}>
                    {inp.currentPrice >= inp.sma200 ? "✓" : "✕"}
                  </span>
                  <span style={{ fontSize: "11px", color: inp.currentPrice >= inp.sma200 ? "#10d97e" : "#ff4136" }}>
                    {inp.currentPrice >= inp.sma200
                      ? `Above SMA (+${f(((inp.currentPrice / inp.sma200) - 1) * 100)}%)`
                      : `Falling Knife — ${f((1 - inp.currentPrice / inp.sma200) * 100)}% below SMA`}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Hairline vertical rule — 2px */}
          <div className="rsp-hairline-v" style={{ background: C.border, width: "2px" }} />

          {/* ── RIGHT COLUMN TOP: Verdict + Valuation + Scorecard ─────────── */}
          <div className="rsp-right-top" style={{ paddingLeft: "40px", paddingTop: "12px", animation: "fadeInUp 0.5s 0.2s ease both" }}>

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
                grades={analystData.grades}
                estimateSpread={analystData.estimateSpread}
                forwardEPS={inp.forwardEPS}
                lifecycleOnly
              />
            )}


          </div>

          {/* ── RIGHT COLUMN BOTTOM: 05 + 06 + How It Works ────────────────── */}
          <div className="rsp-right-bottom" style={{ paddingLeft: "40px", paddingBottom: "40px" }}>

            <div style={{ marginTop: "24px" }}>
              <SectionLabel num="05" title="Year-by-Year Breakdown" />
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

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
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

        /* ── Desktop grid placement for split right column ───────────────── */
        .rsp-left-col     { grid-column: 1; grid-row: 1 / span 2; }
        .rsp-hairline-v   { grid-column: 2; grid-row: 1 / span 2; }
        .rsp-right-top    { grid-column: 3; grid-row: 1; }
        .rsp-right-bottom { grid-column: 3; grid-row: 2; }

        /* Desktop: verdict text scaled */
        @media (min-width: 768px) {
          .rsp-verdict-num   { font-size: clamp(7.5rem, 21vw, 13.5rem) !important; }
          .rsp-verdict-label { font-size: 25px !important; }
          .rsp-verdict-sub   { font-size: 12px !important; }
        }

        /* Desktop: noise filter first, methodology second */
        .rsp-noise-btn       { order: 1; }
        .rsp-methodology-btn { order: 2; }

        /* ── Mobile (< 768px) ─────────────────────────────────────────────── */
        @media (max-width: 767px) {
          .rsp-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
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
          .rsp-noise-btn { order: 0 !important; }
          .rsp-api-bar {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .rsp-main-grid {
            display: flex !important;
            flex-direction: column !important;
            min-height: unset !important;
          }
          .rsp-hairline-v {
            display: none !important;
          }
          .rsp-right-top {
            order: 1;
            padding-left: 0 !important;
            padding-bottom: 24px;
          }
          .rsp-left-col {
            order: 2;
            padding-right: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding-top: 28px;
          }
          .rsp-right-bottom {
            order: 3;
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
        }

        /* ── Tablet (768px – 1023px) ──────────────────────────────────────── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .rsp-left-col      { padding-right: 24px !important; }
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
