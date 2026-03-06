import { useState, useCallback, useMemo, useRef } from "react";
import type React from "react";

import { calcTUP } from "./lib/calcTUP.ts";
import { lookupTicker } from "./lib/api.ts";
import { f, fB } from "./lib/utils.ts";
import type { InputState, Mode, TUPResult, FMPEarningSurprise, FMPCashFlow, FMPIncomeStatement } from "./lib/types.ts";

import { SectionLabel, DataRow, DerivedStat } from "./components/ui.tsx";
import { VerdictCard } from "./components/VerdictCard.tsx";
import { ValuationContext } from "./components/ValuationContext.tsx";
import { CompanyScorecard } from "./components/CompanyScorecard.tsx";
import { Table } from "./components/Table.tsx";
import { MethodologyPage } from "./components/MethodologyPage.tsx";

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
      style={style}
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
  };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
        {badge}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <HoldButton onStep={() => onStep(-stepSize)} style={btnStyle}>▼</HoldButton>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 600, color: "#00BFA5", minWidth: "52px", textAlign: "center" }}>
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
  lynchRatio: number | null;
  dcf: number | null;
  altmanZ: number | null;
  piotroski: number | null;
}

interface ScorecardState {
  earnings: FMPEarningSurprise[];
  cashFlows: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
}

export default function App() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchLog, setFetchLog] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("standard");
  const [noiseFilter, setNoiseFilter] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [growthUncapped, setGrowthUncapped] = useState(false);
  const [company, setCompany] = useState("");
  const [meta, setMeta] = useState<{ sector: string; industry: string }>({ sector: "", industry: "" });
  const [isConverted, setIsConverted] = useState(false);
  const [currencyNote, setCurrencyNote] = useState("");
  const [currencyMismatchWarning, setCurrencyMismatchWarning] = useState("");
  const [divNote, setDivNote] = useState("");
  const [valuation, setValuation] = useState<ValuationState>({ lynchRatio: null, dcf: null, altmanZ: null, piotroski: null });
  const [scorecard, setScorecard] = useState<ScorecardState>({ earnings: [], cashFlows: [], incomeHistory: [] });
  const [showScorecard, setShowScorecard] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const [inp, setInp] = useState<InputState>({
    marketCap: 0, debt: 0, cash: 0, shares: 1,
    ttmEPS: 0, forwardEPS: 0, historicalGrowth: 10, analystGrowth: 10,
    revenuePerShare: 0, targetMargin: 15, inceptionGrowth: 30, breakEvenYear: 2,
    currentPrice: 0, sma200: 0, dividendYield: 0,
  });

  const set = useCallback(<K extends keyof InputState>(k: K, v: InputState[K]) => setInp(p => ({ ...p, [k]: v })), []);

  const GROWTH_CAP = 30;
  const rawBlended = mode === "standard"
    ? (inp.historicalGrowth + inp.analystGrowth) / 2
    : (inp.inceptionGrowth + inp.analystGrowth) / 2;
  const isOverCap = rawBlended > GROWTH_CAP;
  const growthScale = isOverCap && !growthUncapped ? GROWTH_CAP / rawBlended : 1;

  const effectiveInp = useMemo(() => {
    if (growthScale === 1) return inp;
    return {
      ...inp,
      historicalGrowth: inp.historicalGrowth * growthScale,
      analystGrowth: inp.analystGrowth * growthScale,
      inceptionGrowth: inp.inceptionGrowth * growthScale,
    };
  }, [inp, growthScale]);

  const result: TUPResult | null = useMemo(() => calcTUP(effectiveInp, mode), [effectiveInp, mode]);

  const doFetch = async () => {
    if (!ticker.trim()) { setError("Enter a ticker symbol."); return; }
    setLoading(true); setError(""); setFetchLog([]); setIsConverted(false); setCurrencyNote(""); setCurrencyMismatchWarning(""); setDivNote(""); setValuation({ lynchRatio: null, dcf: null, altmanZ: null, piotroski: null }); setScorecard({ earnings: [], cashFlows: [], incomeHistory: [] }); setShowScorecard(false); setHasSearched(true); setGrowthUncapped(false);

    const log = (msg: string) => setFetchLog(p => [...p, msg]);
    try {
      const data = await lookupTicker(ticker.toUpperCase(), log);

      setCompany(data.companyName);
      setMeta({ sector: data.sector, industry: data.industry });
      setIsConverted(data.isConverted || false);
      setCurrencyNote(data.currencyNote || "");
      setCurrencyMismatchWarning(data.currencyMismatchWarning || "");
      setDivNote(data.divNote || "");
      setValuation({ lynchRatio: data.peterLynchRatio, dcf: data.dcfValue, altmanZ: data.altmanZ, piotroski: data.piotroski });
      setScorecard({ earnings: data.earningsSurprises, cashFlows: data.cashFlowHistory, incomeHistory: data.incomeHistory });
      setInp({
        marketCap: data.marketCap, debt: data.debt, cash: data.cash, shares: data.shares,
        ttmEPS: data.ttmEPS, forwardEPS: data.forwardEPS,
        historicalGrowth: data.historicalGrowth, analystGrowth: data.analystGrowth,
        revenuePerShare: data.revenuePerShare, targetMargin: data.targetMargin,
        inceptionGrowth: data.inceptionGrowth, breakEvenYear: data.breakEvenYear,
        currentPrice: data.currentPrice, sma200: data.sma200,
        dividendYield: data.dividendYield || 0,
      });
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
            <button onClick={() => setNoiseFilter(!noiseFilter)} style={toggleBtn(noiseFilter)}>
              {noiseFilter ? "◉" : "○"} Noise Filter
            </button>
            <div style={{ display: "flex", border: `1px solid ${C.borderWeak}` }}>
              {(["standard", "preprofit"] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "5px 12px",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: mode === m ? C.accent : "transparent",
                  color: mode === m ? "#080808" : C.text2,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: C.body,
                  borderLeft: m === "preprofit" ? `1px solid ${C.borderWeak}` : "none",
                }}>
                  {m === "standard" ? "Standard" : "Pre-Profit"}
                </button>
              ))}
            </div>
          </div>
        </header>

        {!hasSearched && (
        /* ── HERO SEARCH ─────────────────────────────────────────────────── */
        <section style={{ padding: "64px 0 72px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.5s 0.1s ease both" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: C.text3, marginBottom: "20px" }}>
            Stock Valuation Engine
          </div>
          <h2 style={{
            fontFamily: C.serif,
            fontWeight: 400,
            fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: C.text1,
            textAlign: "center",
            margin: "0 0 40px",
            maxWidth: "520px",
          }}>
            Enter a Ticker to Calculate<br /><em style={{ color: C.accent }}>Time Until Payback</em>
          </h2>

          <div className="rsp-hero-row" style={{ width: "100%", maxWidth: "600px", display: "flex", gap: "0", border: `2px solid ${C.accent}`, animation: "heroGlow 2.4s ease-in-out infinite" }}>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && doFetch()}
              placeholder="Search Ticker (e.g., NVO, AAPL)..."
              autoFocus
              style={{
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

          <div style={{ marginTop: "16px", fontSize: "10px", color: C.text3, letterSpacing: "0.08em" }}>
            Powered by Financial Modeling Prep · Enter any US or international ticker
          </div>
        </section>
        )}

        {hasSearched && (<>
        {/* ── COMPACT TICKER BAR (post-search) ─────────────────────────────── */}
        <section style={{ paddingTop: "20px", paddingBottom: "20px", marginBottom: "20px", borderBottom: `1px solid ${C.borderWeak}`, animation: "fadeInUp 0.4s ease both" }}>
          <div className="rsp-api-bar" style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: "20px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text2, marginBottom: "6px" }}>Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && doFetch()}
                placeholder="AAPL"
                style={{ ...inputShared, letterSpacing: "0.12em", textTransform: "uppercase" }}
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

        {/* ── MAIN GRID: asymmetric 5:7 ────────────────────────────────────── */}
        <div className="rsp-main-grid" style={{ display: "grid", gridTemplateColumns: "5fr 2px 7fr", gap: "0", minHeight: "600px" }}>

          {/* ── LEFT COLUMN: Data / Manual Inputs ─────────────────────────── */}
          <div className="rsp-left-col" style={{ paddingRight: "40px", paddingBottom: "40px", paddingTop: "28px", animation: "fadeInUp 0.5s 0.15s ease both" }}>

            {hasSearched && !company && (
              <div style={{ paddingTop: "48px" }}>
                <div style={{ fontFamily: C.serif, color: C.accent, fontSize: "28px", marginBottom: "16px", lineHeight: 1 }}>→</div>
                <p style={{ fontSize: "11px", color: "#505050", lineHeight: 1.9, margin: 0 }}>
                  Enter a ticker above<br />and click Fetch Data —<br />all values load automatically.
                </p>
              </div>
            )}

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
              <SectionLabel num="02" title={mode === "standard" ? "Earnings" : "Revenue-Based Earnings"} />
              {mode === "standard" ? (
                <>
                  <DataRow label="TTM EPS"            value={company ? `$${f(inp.ttmEPS)}` : "—"} />
                  <DataRow label="Forward EPS (est.)" value={company ? `$${f(inp.forwardEPS)}` : "—"} />
                  {company && <DerivedStat label="Blended EPS = Avg(TTM, Forward)" value={`$${f((inp.ttmEPS + inp.forwardEPS) / 2)}`} />}
                </>
              ) : (
                <>
                  <DataRow label="Revenue / Share"   value={company ? `$${f(inp.revenuePerShare)}` : "—"} />
                  <DataRow label="Target Net Margin" value={company ? `${f(inp.targetMargin)}%` : "—"} />
                  <DataRow label="Breakeven Year"    value={company ? inp.breakEvenYear : "—"} />
                  {company && <DerivedStat label="Implied EPS = Rev/Share × Margin" value={`$${f(inp.revenuePerShare * (inp.targetMargin / 100))}`} accent="#f5a020" />}
                </>
              )}
            </div>

            {/* 03 Growth */}
            <div style={{ marginBottom: "32px" }}>
              <SectionLabel num="03" title="Growth Assumptions" />
              {(() => {
                const blended = mode === "standard" ? (inp.historicalGrowth + inp.analystGrowth) / 2 : (inp.inceptionGrowth + inp.analystGrowth) / 2;
                const divYield = inp.dividendYield || 0;
                const divIsAccelerator = divYield > 3;
                return (
                  <>
                    {mode === "standard"
                      ? <StepperRow
                          label="Historical EPS Growth (avg 10yr)"
                          value={inp.historicalGrowth}
                          onStep={d => set("historicalGrowth", Math.max(0, inp.historicalGrowth + d))}
                        />
                      : <StepperRow
                          label="Inception Revenue CAGR"
                          value={inp.inceptionGrowth}
                          onStep={d => set("inceptionGrowth", Math.max(0, inp.inceptionGrowth + d))}
                        />
                    }
                    <StepperRow
                      label="Analyst Forward Growth (2yr)"
                      value={inp.analystGrowth}
                      onStep={d => set("analystGrowth", Math.max(0, inp.analystGrowth + d))}
                    />
                    <StepperRow
                      label="Dividend Yield"
                      value={divYield}
                      onStep={d => set("dividendYield", Math.max(0, divYield + d))}
                      stepSize={0.1}
                      badge={divIsAccelerator ? (
                        <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#10d97e", border: "1px solid rgba(16,217,126,0.3)", padding: "1px 5px" }}>
                          ★ Accelerator
                        </span>
                      ) : undefined}
                    />
                    {isOverCap && !growthUncapped ? (
                      <>
                        <DerivedStat label="Blended Growth Rate" value={`${f(GROWTH_CAP)}% (capped from ${f(blended)}%)`} accent="#f5a020" />
                        <div style={{ marginTop: "8px", padding: "8px 12px", borderLeft: "2px solid #f5a020", background: "rgba(245,160,32,0.04)", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <span style={{ color: "#f5a020", flexShrink: 0, fontSize: "11px" }}>⚠</span>
                          <div>
                            <span style={{ fontSize: "10px", color: "#f5a020", lineHeight: 1.6 }}>
                              Capped at {GROWTH_CAP}% — sustaining {f(blended)}% growth for 10+ years is unrealistic for most companies.
                            </span>
                            <button
                              onClick={() => setGrowthUncapped(true)}
                              style={{
                                display: "block", marginTop: "6px", background: "none", border: "1px solid rgba(245,160,32,0.4)",
                                color: "#f5a020", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                                padding: "3px 8px", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              Use Original: {f(blended)}%
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <DerivedStat label="Blended Growth Rate" value={`${f(blended)}%`} accent="#10d97e" />
                        {isOverCap && growthUncapped && (
                          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "9px", color: "#f5a020", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Uncapped</span>
                            <button
                              onClick={() => setGrowthUncapped(false)}
                              style={{
                                background: "none", border: "1px solid rgba(255,255,255,0.12)",
                                color: "#888888", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                                padding: "2px 7px", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              Re-apply Cap
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {divYield > 0 && (
                      <DerivedStat
                        label="Total TUP Growth Rate"
                        value={`(${f(isOverCap && !growthUncapped ? GROWTH_CAP : blended)}% + ${f(divYield)}%) = ${f((isOverCap && !growthUncapped ? GROWTH_CAP : blended) + divYield)}%`}
                        accent="#C4A06E"
                      />
                    )}
                  </>
                );
              })()}
            </div>

            {/* 04 Technical */}
            <div style={{ marginBottom: "32px" }}>
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
          <div className="rsp-right-top" style={{ paddingLeft: "40px", paddingTop: "28px", animation: "fadeInUp 0.5s 0.2s ease both" }}>

            <VerdictCard result={result} mode={mode} noiseFilter={noiseFilter} onGrowthStep={(d: number) => {
              if (mode === "standard") set("historicalGrowth", Math.max(0, inp.historicalGrowth + d));
              else set("inceptionGrowth", Math.max(0, inp.inceptionGrowth + d));
              set("analystGrowth", Math.max(0, inp.analystGrowth + d));
            }} />

            <ValuationContext
              lynchRatio={valuation.lynchRatio}
              dcf={valuation.dcf}
              currentPrice={inp.currentPrice}
              altmanZ={valuation.altmanZ}
              piotroski={valuation.piotroski}
            />

            {company && (scorecard.earnings.length > 0 || scorecard.cashFlows.length > 0) && (
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={() => setShowScorecard(s => !s)}
                  style={{
                    width: "100%",
                    padding: "8px 16px",
                    background: C.accent,
                    color: "#080808",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: C.body,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    transition: "opacity 0.15s",
                    marginTop: "4px",
                  }}
                >
                  {showScorecard ? "▾" : "▸"} Company Health Scorecard
                </button>
                {showScorecard && (
                  <CompanyScorecard
                    earnings={scorecard.earnings}
                    cashFlows={scorecard.cashFlows}
                    incomeHistory={scorecard.incomeHistory}
                  />
                )}
              </div>
            )}

            {result && !noiseFilter && (
              <div style={{ marginTop: "20px", padding: "12px 0", borderBottom: `1px solid ${C.borderWeak}` }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text2, marginBottom: "6px" }}>Formula</div>
                <p style={{ fontSize: "11px", color: C.text2, fontFamily: C.mono, lineHeight: 1.7, margin: 0 }}>
                  {mode === "standard"
                    ? `(${fB(inp.marketCap)} + ${fB(inp.debt)} − ${fB(inp.cash)}) / ${(inp.shares / 1e9).toFixed(2)}B = $${f(result.adjPrice)} adj. price`
                    : `EPS = $${f(inp.revenuePerShare)} × ${inp.targetMargin}% = $${f(result.epsBase)} | Start Yr ${inp.breakEvenYear} | Adj $${f(result.adjPrice)}`}
                </p>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN BOTTOM: 05 + 06 + How It Works ────────────────── */}
          <div className="rsp-right-bottom" style={{ paddingLeft: "40px", paddingBottom: "40px" }}>

            <div style={{ marginTop: "24px" }}>
              <SectionLabel num="05" title="Year-by-Year Breakdown" />
              <Table result={result} />
            </div>

            {company && result && !noiseFilter && (
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${C.borderWeak}` }}>
                <SectionLabel num="06" title="Perspective" />
                {(() => {
                  const divYield = inp.dividendYield || 0;
                  const isAccelerator = divYield > 3;
                  const isPayer = divYield > 0;
                  return (
                    <div style={{ display: "flex", gap: "0" }}>
                      <div style={{ flex: "0 0 auto", paddingRight: "20px", borderRight: `1px solid ${C.borderWeak}`, marginRight: "20px" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "6px" }}>
                          Fwd Dividend Yield
                        </div>
                        <div style={{
                          fontFamily: C.serif,
                          fontSize: "clamp(2rem, 5vw, 3rem)",
                          lineHeight: 1,
                          fontWeight: 400,
                          color: isAccelerator ? "#10d97e" : isPayer ? C.accentAlt : C.text3,
                          letterSpacing: "-0.02em",
                        }}>
                          {f(divYield)}%
                        </div>
                        {isAccelerator && (
                          <div style={{ marginTop: "6px", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#10d97e" }}>
                            ★ Acceleration Factor
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "11px", color: C.text2, lineHeight: 1.8, margin: "0 0 10px" }}>
                          {isPayer
                            ? <>This <strong style={{ color: C.text1 }}>{f(divYield)}%</strong> annual cash return is earned regardless of share price movement — it functions as a safety margin that reduces your effective cost basis every year you hold.</>
                            : "No dividend paid. Total return depends entirely on price appreciation and EPS compounding."}
                        </p>
                        {isPayer && (
                          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3 }}>Calc</span>
                            <span style={{ fontFamily: C.mono, fontSize: "10px", color: C.text3 }}>{divNote || `adjDiv × freq ÷ price`}</span>
                          </div>
                        )}
                        {isPayer && (
                          <div style={{ marginTop: "8px", display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3 }}>TUP Impact</span>
                            <span style={{ fontFamily: C.mono, fontSize: "10px", color: isAccelerator ? "#10d97e" : C.accentAlt }}>
                              +{f(divYield)}% added to compounding rate
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3 }}>
                  {mode === "standard" ? "Standard TUP" : "Pre-Profit TUP-P"} — How It Works
                </div>
                {mode === "standard" && (
                  <button onClick={() => { setShowMethodology(true); window.scrollTo(0, 0); }} style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                    color: C.accent, fontFamily: C.body, flexShrink: 0,
                  }}>
                    Read Methodology →
                  </button>
                )}
              </div>
              {mode === "preprofit" && (
                <p style={{ fontSize: "11px", color: C.text2, lineHeight: 1.8, margin: "12px 0 0" }}>
                  For high-growth pre-profit companies. Uses revenue/share × target margin as implied EPS, starts
                  summing from the breakeven year, blends inception + analyst growth. Stricter threshold:{" "}
                  <strong style={{ color: C.text1 }}>8 years</strong>.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}`, paddingBottom: "32px" }}>
          <p style={{ fontSize: "10px", color: C.text3, margin: 0, textAlign: "center" }}>
            TUP Calculator — For educational purposes only. Not financial advice. Data via Financial Modeling Prep API.
          </p>
        </footer>

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

        /* ── Mobile (< 768px) ─────────────────────────────────────────────── */
        @media (max-width: 767px) {
          .rsp-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
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
