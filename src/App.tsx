import { useState, useMemo } from "react";

import { calcTUP } from "./lib/calcTUP.ts";
import { C } from "./lib/theme.ts";
import type { InputState, Mode, TUPResult, GrowthScenario } from "./lib/types.ts";

import { VerdictCard } from "./components/VerdictCard";
import { ValuationContext } from "./components/ValuationContext";
import { CompanyScorecard } from "./components/CompanyScorecard";
import { MethodologyPage } from "./components/MethodologyPage";
import { Masthead } from "./components/Masthead";
import { HeroSearch } from "./components/HeroSearch";
import { CompactTickerBar } from "./components/CompactTickerBar";
import { DataSections } from "./components/DataSections";
import { useTickerFetch } from "./hooks/useTickerFetch.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const {
    // Search / dice UI
    ticker, setTicker, loading, error, fetchLog,
    rollingDice, dicePhrase,
    isFilterOpen, setIsFilterOpen, rollFilters, setRollFilters, hasActiveFilters,
    // Actions
    doFetch, rollDice, cancelDice, resetSearch,
    // Fetched data
    company, meta, isConverted, currencyNote, currencyMismatchWarning,
    valuation, scorecard, hasSearched,
    strongBuyPrice, buyPrice,
    // Shared mutable state
    inp, setInp,
    growthPeriod, setGrowthPeriod,
    growthScenario, setGrowthScenario,
    growthValues, growthYears,
    scenarioValues, hasScenarioData,
  } = useTickerFetch();

  const [showMethodology, setShowMethodology] = useState(false);
  const mode: Mode = "standard";
  const result: TUPResult | null = useMemo(() => calcTUP(inp, mode), [inp, mode]);

  const onScenarioChange = (s: GrowthScenario) => {
    setGrowthScenario(s);
    const v = scenarioValues[s];
    setInp(p => ({ ...p, fwdGrowthY1: v.y1, fwdGrowthY2: v.y2, fwdCAGR: v.cagr, growthOverrides: {} }));
  };

  if (showMethodology) return <MethodologyPage onBack={() => setShowMethodology(false)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: C.body, boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Barlow+Condensed:wght@400;700;900&family=Space+Grotesk:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <main id="main-content" className="rsp-container" style={{ margin: "0 auto", padding: "0 24px" }}>
        <div className="sr-only" aria-live="polite">
          {loading ? "Loading stock data..." : ""}
          {error ? `Error: ${error}` : ""}
          {result && company ? `${company}: ${result.paybackNote ? "N/A — unable to calculate payback" : `${result.payback || "30+"} year payback`}` : ""}
        </div>

        <Masthead
          company={company}
          meta={meta}
          isConverted={isConverted}
          currencyNote={currencyNote}
          onShowMethodology={() => { setShowMethodology(true); setIsFilterOpen(false); window.scrollTo(0, 0); }}
          onReset={hasSearched ? () => { resetSearch(); window.scrollTo(0, 0); } : undefined}
        />

        {!hasSearched && (
          <HeroSearch
            ticker={ticker}
            onTickerChange={setTicker}
            onTickerSelect={(sym: string) => { setTicker(sym); doFetch(sym); }}
            onFetch={doFetch}
            loading={loading}
            error={error}
            onRollDice={rollDice}
            onCancelDice={cancelDice}
            rollingDice={rollingDice}
            dicePhrase={dicePhrase}

            isFilterOpen={isFilterOpen}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            rollFilters={rollFilters}
            onApplyFilters={setRollFilters}
            onResetFilters={() => setRollFilters({ marketCap: [], sector: "", exchange: [], indexEtf: "", tupRange: [] })}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {hasSearched && (<>
          <CompactTickerBar
            ticker={ticker}
            onTickerChange={setTicker}
            onTickerSelect={(sym: string) => { setTicker(sym); doFetch(sym); }}
            onFetch={doFetch}
            loading={loading}
            error={error}
            fetchLog={fetchLog}
            onRollDice={rollDice}
            onCancelDice={cancelDice}
            rollingDice={rollingDice}
            dicePhrase={dicePhrase}

            isFilterOpen={isFilterOpen}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            rollFilters={rollFilters}
            onApplyFilters={setRollFilters}
            onResetFilters={() => setRollFilters({ marketCap: [], sector: "", exchange: [], indexEtf: "", tupRange: [] })}
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
            }}
              onGrowthSet={(val: number) => {
              setGrowthScenario("base");
              const adjusted = Math.max(0, val - (inp.dividendYield || 0));
              setInp(p => ({
                ...p,
                historicalGrowth: adjusted,
                analystGrowth: adjusted,
                fwdGrowthY1: adjusted,
                fwdGrowthY2: p.fwdGrowthY2 != null ? adjusted : null,
                fwdCAGR: p.fwdCAGR != null ? adjusted : null,
                growthOverrides: {},
              }));
            }} />

          </div>

          {/* Data sections (01–03 left column, 04 right column) */}
          <DataSections
            inp={inp}
            company={company}
            currencyMismatchWarning={currencyMismatchWarning}
            growthPeriod={growthPeriod}
            growthYears={growthYears}
            epsGrowthHistory={scorecard.epsGrowthHistory}
            onGrowthPeriodChange={p => {
              if (p === "10yr" && growthYears.long <= growthYears.short) return;
              setGrowthPeriod(p);
              setInp(prev => ({ ...prev, historicalGrowth: p === "5yr" ? growthValues.g5 : growthValues.g10, growthOverrides: {} }));
            }}
            decayMode={inp.decayMode}
            onDecayModeToggle={(mode) => setInp(p => ({ ...p, decayMode: p.decayMode === mode ? "none" : mode }))}
            result={result}
            growthOverrides={inp.growthOverrides}
            onGrowthChange={(year, val) => {
              setInp(p => {
                const overrides = { ...p.growthOverrides };
                for (let y = year; y <= 30; y++) overrides[y] = val;
                return { ...p, growthOverrides: overrides };
              });
            }}
          />

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
              adjPrice={result?.adjPrice}
              industryGrowth={valuation.industryGrowth}
              industryGrowthLoading={valuation.industryGrowthLoading}
              companyBlendedGrowth={result?.grTerminal != null ? result.grTerminal * 100 : null}
            />
            {company && (
              <CompanyScorecard
                earnings={scorecard.earnings}
                cashFlows={scorecard.cashFlows}
                incomeHistory={scorecard.incomeHistory}
                description={scorecard.description}
                exchange={scorecard.exchange}
                lifecycleOnly
                dividendYield={inp.dividendYield}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}`, paddingBottom: "32px" }}>
          <p style={{ fontSize: "10px", color: C.text3, margin: 0, textAlign: "center" }}>
            TUP Calculator — For educational purposes only. Not financial advice. Data via Financial Modeling Prep API.
          </p>
        </footer>
        </>)}

      </main>

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

        /* Desktop: dice filter row wrappers are invisible (flattened) */
        .rsp-dice-row { display: contents; }

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
        .rsp-methodology-mobile { display: none; }

        /* ── Mobile (< 768px) ─────────────────────────────────────────────── */
        @media (max-width: 767px) {
          .rsp-growth-row {
            flex-wrap: wrap !important;
          }
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
            display: none !important;
          }
          .rsp-methodology-mobile { display: inline-flex !important; }
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
          .rsp-ticker-bar .rsp-api-bar {
            padding-top: 18px !important;
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
          .rsp-dice-filter-wrap.rsp-dice-filter-open {
            max-height: 600px !important;
          }
          .rsp-dice-filter {
            flex-direction: column !important;
            align-items: flex-end !important;
            gap: 10px !important;
            padding-right: 8px !important;
          }
          .rsp-dice-row {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: flex-end !important;
            justify-content: flex-end !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .rsp-dice-btn-group {
            width: 100% !important;
          }
          .rsp-dice-btn-group button {
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }
          .rsp-dice-btn-group > div:first-child {
            text-align: left !important;
            margin-left: 4px !important;
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
