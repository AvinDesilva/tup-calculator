import { useState, useMemo } from "react";

import { calcTUP } from "./lib/verdictCard/calcTUP.ts";
import { C } from "./lib/theme.ts";
import { f } from "./lib/utils.ts";
import type { InputState, Mode, TUPResult, GrowthScenario, PriceMode } from "./lib/types.ts";

import { VerdictCard } from "./components/VerdictCard";
import { ValuationContext } from "./components/ValuationContext";
import { CompanyScorecard } from "./components/CompanyScorecard";
import { MethodologyPage } from "./components/MethodologyPage";
import { Masthead } from "./components/Masthead";
import { HeroSearch } from "./components/HeroSearch";
import { CompactTickerBar } from "./components/CompactTickerBar";
import { DataSections } from "./components/DataSections";
import { PriceProjectionGraph } from "./components/PriceProjectionGraph";
import { TabNav } from "./components/TabNav";
import type { Tab } from "./components/TabNav";
import { useTickerFetch } from "./hooks/useTickerFetch.ts";
import type { IndustryGrowthData } from "./lib/tickerSearch/api.ts";
import "./App.css";

// ─── Industry Growth Panel ────────────────────────────────────────────────────

function IndustryGrowthPanel({ industryGrowth, industryGrowthLoading, companyBlendedGrowth }: {
  industryGrowth: IndustryGrowthData | null;
  industryGrowthLoading: boolean;
  companyBlendedGrowth: number | null;
}) {
  const mono = C.mono;
  let color = "#888", value = "...", sub = "";
  if (industryGrowthLoading) {
    sub = "Loading";
  } else if (industryGrowth && !industryGrowth.error && industryGrowth.median != null) {
    value = `${industryGrowth.median.toFixed(1)}%`;
    if (companyBlendedGrowth != null) {
      const diff = companyBlendedGrowth - industryGrowth.median;
      color = diff > 2 ? "#10d97e" : diff < -2 ? "#FF4D00" : "#f5a020";
      sub = industryGrowth.industry;
    } else {
      sub = `n=${industryGrowth.count}`;
    }
  }
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderWeak}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3, marginBottom: 8 }}>
        Industry Growth
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: mono, fontSize: "20px", fontWeight: 600, color, letterSpacing: "-0.02em" }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", letterSpacing: "0.06em" }}>{sub}</div>
    </div>
  );
}

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
    company, currencyMismatchWarning,
    valuation, scorecard, hasSearched,
    strongBuyPrice, buyPrice, guruData,
    priceHistory,
    // Shared mutable state
    inp, setInp,
    growthPeriod, setGrowthPeriod,
    growthScenario, setGrowthScenario,
    growthValues, growthYears,
    scenarioValues, hasScenarioData,
  } = useTickerFetch();

  const [showMethodology, setShowMethodology] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>("adj");
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const mode: Mode = "standard";
  const result: TUPResult | null = useMemo(
    () => calcTUP(inp, mode, priceMode === "listed" && inp.currentPrice > 0 ? inp.currentPrice : undefined),
    [inp, mode, priceMode],
  );

  const { displayStrongBuyPrice, displayBuyPrice } = useMemo(() => {
    if (!result || result.rows.length < 10)
      return { displayStrongBuyPrice: strongBuyPrice, displayBuyPrice: buyPrice };
    if (priceMode === "listed") {
      const sb = result.rows[6].cum;
      const bp = result.rows[9].cum;
      return { displayStrongBuyPrice: sb > 0 ? sb : null, displayBuyPrice: bp > 0 ? bp : null };
    }
    return { displayStrongBuyPrice: strongBuyPrice, displayBuyPrice: buyPrice };
  }, [priceMode, result, strongBuyPrice, buyPrice]);

  const handleFetch = (sym?: string) => {
    setPriceMode("adj");
    setActiveTab("analysis");
    doFetch(sym);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

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
          onShowMethodology={() => { setShowMethodology(true); setIsFilterOpen(false); window.scrollTo(0, 0); }}
          onReset={hasSearched ? () => { resetSearch(); window.scrollTo(0, 0); } : undefined}
        />

        {!hasSearched && (
          <HeroSearch
            ticker={ticker}
            onTickerChange={setTicker}
            onTickerSelect={(sym: string) => { setTicker(sym); handleFetch(sym); }}
            onFetch={handleFetch}
            loading={loading}
            error={error}
            onRollDice={() => { setPriceMode("adj"); rollDice(); }}
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

        {hasSearched && (
          <div style={{ position: "sticky", top: 0, zIndex: 100, background: C.bg }}>
            <CompactTickerBar
              ticker={ticker}
              onTickerChange={setTicker}
              onTickerSelect={(sym: string) => { setTicker(sym); handleFetch(sym); }}
              onFetch={handleFetch}
              loading={loading}
              error={error}
              fetchLog={fetchLog}
              onRollDice={() => { setPriceMode("adj"); rollDice(); }}
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
            <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        )}

        {hasSearched && activeTab === "analysis" && (
          <div className="rsp-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2px 2fr", gridTemplateRows: "auto 2px auto", gap: "0", alignItems: "start", paddingTop: "12px" }}>

            {/* Col 1: Verdict */}
            <div className="rsp-left-verdict" style={{ paddingLeft: "40px", paddingRight: "40px", paddingTop: "12px", paddingBottom: "0", animation: "fadeInUp 0.5s 0.15s ease both" }}>

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
                priceMode={priceMode}
                onPriceModeToggle={() => setPriceMode(m => m === "adj" ? "listed" : "adj")}
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

            {/* Hairline vertical */}
            <div className="rsp-hairline-v" style={{ background: C.border, width: "2px" }} />

            {/* Col 3: Price Projection Graph */}
            <div className="rsp-right-graph" style={{ paddingLeft: "40px", paddingRight: "40px", paddingTop: "7px", paddingBottom: "28px", animation: "fadeInUp 0.5s 0.2s ease both", alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
              <PriceProjectionGraph
                priceHistory={priceHistory}
                currentPrice={inp.currentPrice}
                ticker={ticker}
                scenarioValues={scenarioValues}
                growthScenario={growthScenario}
                result={result}
                sma200={inp.sma200}
                rollingDice={rollingDice}
                onScenarioChange={onScenarioChange}
                lifecycleStage={inp.lifecycleStage}
                dividendYield={inp.dividendYield}
              />
            </div>

            {/* Hairline horizontal */}
            <div className="rsp-hairline-h" style={{ background: C.border, height: "2px" }} />

            {/* Mobile summary — hidden on desktop, shown on mobile */}
            {(() => {
              const techStatus = result ? (
                result.paybackNote ? { label: "N/A", color: "#888", sym: "—" } :
                (!result.fallingKnife && result.sma200 > 0) ? { label: "Sound", color: "#00BFA5", sym: "✓" } :
                (result.fallingKnife && result.verdict === "spec_buy") ? { label: "Weak", color: "#f5a020", sym: "!" } :
                (result.fallingKnife && result.verdict === "avoid") ? { label: "Avoid", color: "#ff4136", sym: "⚠" } :
                null
              ) : null;
              return (
                <div className="rsp-mobile-summary" style={{ display: "none", animation: "fadeInUp 0.5s 0.2s ease both" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>{priceMode === "adj" ? "Adj. Price" : "Listed Price"}</div>
                    <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: C.text1 }}>${f(priceMode === "adj" ? result?.adjPrice : inp.currentPrice)}</div>
                    {inp.currentPrice > 0 && (
                      <button
                        onClick={() => setPriceMode(m => m === "adj" ? "listed" : "adj")}
                        aria-label={`Switch to ${priceMode === "adj" ? "listed" : "adjusted"} price`}
                        aria-pressed={priceMode === "listed"}
                        style={{
                          marginTop: "6px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                          textTransform: "uppercase", padding: "2px 6px",
                          border: `1px solid ${priceMode === "listed" ? "#C4A06E" : "rgba(255,255,255,0.15)"}`,
                          borderRadius: "10px",
                          background: priceMode === "listed" ? "rgba(196,160,110,0.15)" : "transparent",
                          color: priceMode === "listed" ? "#C4A06E" : "#555",
                          cursor: "pointer", lineHeight: 1.4,
                        }}
                      >
                        {priceMode === "adj" ? "LISTED" : "ADJ"}
                      </button>
                    )}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Growth</div>
                    <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: "#10d97e" }}>{result ? f(result.gr * 100) : "—"}%</div>
                  </div>
                  {techStatus && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Technical</div>
                      <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: techStatus.color }}>{techStatus.sym} {techStatus.label}</div>
                    </div>
                  )}
                  {result?.tamWarning && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>TAM</div>
                      <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: "#f5a020" }}>⚠ Warn</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {hasSearched && activeTab === "metrics" && (
          <div style={{ animation: "fadeInUp 0.5s 0.1s ease both", paddingTop: "12px", paddingBottom: "28px" }}>
            <ValuationContext
              strongBuyPrice={displayStrongBuyPrice}
              buyPrice={displayBuyPrice}
              currentPrice={inp.currentPrice}
              adjPrice={result?.adjPrice}
              priceMode={priceMode}
              guruData={guruData}
            />
          </div>
        )}

        {hasSearched && activeTab === "profile" && (
          <div style={{ animation: "fadeInUp 0.5s 0.1s ease both", paddingTop: "12px", paddingBottom: "28px" }}>
            {company ? (
              <>
                <CompanyScorecard
                  cashFlows={scorecard.cashFlows}
                  incomeHistory={scorecard.incomeHistory}
                  description={scorecard.description}
                  dividendYield={inp.dividendYield}
                />
                {(valuation.industryGrowth || valuation.industryGrowthLoading) && (
                  <IndustryGrowthPanel
                    industryGrowth={valuation.industryGrowth}
                    industryGrowthLoading={valuation.industryGrowthLoading}
                    companyBlendedGrowth={result?.grTerminal != null ? result.grTerminal * 100 : null}
                  />
                )}
              </>
            ) : (
              <div style={{ paddingTop: "48px" }}>
                <div style={{ fontFamily: C.serif, color: C.accent, fontSize: "28px", marginBottom: "16px", lineHeight: 1 }}>→</div>
                <p style={{ fontSize: "11px", color: "#505050", lineHeight: 1.9, margin: 0 }}>
                  Enter a ticker above<br />and click Fetch Data —<br />all values load automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {hasSearched && activeTab === "logic" && (
          <div className="rsp-data-sections-wrap" style={{ animation: "fadeInUp 0.5s 0.1s ease both" }}>
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
          </div>
        )}

        {hasSearched && (
          <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}`, paddingBottom: "32px" }}>
            <p style={{ fontSize: "10px", color: C.text3, margin: 0, textAlign: "center" }}>
              TUP Calculator — For educational purposes only. Not financial advice. Data via Financial Modeling Prep API.
            </p>
          </footer>
        )}

      </main>
    </div>
  );
}
