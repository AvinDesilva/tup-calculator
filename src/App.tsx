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
import { useTickerFetch } from "./hooks/useTickerFetch.ts";
import "./App.css";

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

  const handleFetch = (sym?: string) => { setPriceMode("adj"); doFetch(sym); };

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

        {hasSearched && (<>
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
        </>)}

        {hasSearched && (<>
        <div className="rsp-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2px 2fr", gridTemplateRows: "auto 2px auto 2px auto", gap: "0", alignItems: "start" }}>

          {/* Row 1, col 1: Verdict */}
          <div className="rsp-left-verdict" style={{ paddingLeft: "40px", paddingRight: "40px", paddingTop: "28px", paddingBottom: "0", animation: "fadeInUp 0.5s 0.15s ease both" }}>

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

          {/* Row 1, col 3: Price Projection Graph */}
          <div className="rsp-right-graph" style={{ paddingLeft: "40px", paddingRight: "40px", paddingTop: "28px", paddingBottom: "28px", animation: "fadeInUp 0.5s 0.2s ease both", alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
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
            />
          </div>

          {/* Hairline vertical — top row only */}
          <div className="rsp-hairline-v" style={{ background: C.border, width: "2px" }} />

          {/* Hairline horizontal — after top row */}
          <div className="rsp-hairline-h" style={{ background: C.border, height: "2px" }} />

          {/* Mobile summary — hidden on desktop, shown on mobile between graph and context */}
          <div className="rsp-mobile-summary" style={{ display: "none", animation: "fadeInUp 0.5s 0.2s ease both" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Adj. Price</div>
              <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: C.text1 }}>${f(result?.adjPrice)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>EPS Base</div>
              <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: C.text1 }}>${f(result?.epsBase)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Growth</div>
              <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: "#10d97e" }}>{result ? f(result.gr * 100) : "—"}%</div>
            </div>
          </div>

          {/* Mobile technical indicators — hidden on desktop, shown below summary on mobile */}
          {result && (
            <div className="rsp-mobile-warnings" style={{ display: "none" }}>
              {result.paybackNote && (
                <div style={{ margin: "0 0 8px", padding: "14px 16px", borderLeft: "2px solid #888", borderTop: "1px solid rgba(136,136,136,0.2)", borderRight: "1px solid rgba(136,136,136,0.2)", borderBottom: "1px solid rgba(136,136,136,0.2)", background: "rgba(136,136,136,0.05)" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ color: "#888", fontSize: "14px", fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: C.mono }}>—</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Calculation Not Applicable</div>
                      <p style={{ fontSize: "11px", color: "rgba(136,136,136,0.7)", lineHeight: 1.75, margin: 0 }}>{result.paybackNote}</p>
                    </div>
                  </div>
                </div>
              )}
              {!result.paybackNote && !result.fallingKnife && result.sma200 > 0 && (
                <div style={{ margin: "0 0 8px", padding: "14px 16px", borderLeft: "2px solid #00BFA5", borderTop: "1px solid rgba(0,191,165,0.2)", borderRight: "1px solid rgba(0,191,165,0.2)", borderBottom: "1px solid rgba(0,191,165,0.2)", background: "rgba(0,191,165,0.05)" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ color: "#00BFA5", fontSize: "14px", fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: C.mono }}>✓</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#00BFA5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Technically Sound</div>
                      <p style={{ fontSize: "11px", color: "rgba(0,191,165,0.7)", lineHeight: 1.75, margin: 0 }}>Price is trading above the 200-day SMA{result.sma200 > 0 ? ` of $${f(result.sma200)}` : ""}, confirming an uptrend.</p>
                    </div>
                  </div>
                </div>
              )}
              {result.fallingKnife && result.verdict === "spec_buy" && (
                <div style={{ margin: "0 0 8px", padding: "14px 16px", borderLeft: "2px solid #f5a020", borderTop: "1px solid rgba(245,160,32,0.2)", borderRight: "1px solid rgba(245,160,32,0.2)", borderBottom: "1px solid rgba(245,160,32,0.2)", background: "rgba(245,160,32,0.05)" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ color: "#f5a020", fontSize: "14px", fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: C.mono }}>!</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#f5a020", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Warning: Technically Weak</div>
                      <p style={{ fontSize: "11px", color: "#d4923c", lineHeight: 1.75, margin: 0 }}>The math suggests a Buy, but the stock is in a downtrend (trading below its 200-day SMA{result.sma200 > 0 ? ` of $${f(result.sma200)}` : ""}).{" "}<strong style={{ color: "#f5a020" }}>Consider scaling in only after price stabilizes above the 200-day SMA</strong>.</p>
                    </div>
                  </div>
                </div>
              )}
              {result.fallingKnife && result.verdict === "avoid" && (
                <div style={{ margin: "0 0 8px", padding: "10px 14px", borderLeft: "2px solid #ff4136", borderTop: "1px solid rgba(255,65,54,0.15)", borderRight: "1px solid rgba(255,65,54,0.15)", borderBottom: "1px solid rgba(255,65,54,0.15)", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "#ff4136" }}>⚠</span>
                  <span style={{ fontSize: "11px", color: "#ff4136" }}>Falling Knife — Price below 200-day SMA. Technical avoid.</span>
                </div>
              )}
              {result.tamWarning && (
                <div style={{ padding: "10px 14px", borderLeft: "2px solid #f5a020", borderTop: "1px solid rgba(245,160,32,0.15)", borderRight: "1px solid rgba(245,160,32,0.15)", borderBottom: "1px solid rgba(245,160,32,0.15)", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "#f5a020" }}>⚠</span>
                  <span style={{ fontSize: "11px", color: "#f5a020" }}>TAM Warning — Implied Y10 revenue exceeds $5T. Growth may be unrealistic.</span>
                </div>
              )}
            </div>
          )}

          {/* Row 3: ValuationContext + Scorecard — full width */}
          <div className="rsp-bottom-context" style={{ animation: "fadeInUp 0.5s 0.2s ease both" }}>
            <div style={{ flex: "1 1 0", minWidth: 0, paddingLeft: "40px", paddingRight: "40px", paddingTop: "28px", paddingBottom: "28px" }}>
              <ValuationContext
                strongBuyPrice={displayStrongBuyPrice}
                buyPrice={displayBuyPrice}
                dcf={valuation.dcf}
                currentPrice={inp.currentPrice}
                adjPrice={result?.adjPrice}
                industryGrowth={valuation.industryGrowth}
                industryGrowthLoading={valuation.industryGrowthLoading}
                companyBlendedGrowth={result?.grTerminal != null ? result.grTerminal * 100 : null}
                priceMode={priceMode}
              />
            </div>
            {company && (
              <div style={{ flex: "1 1 0", minWidth: 0, paddingLeft: "40px", paddingRight: "40px", paddingTop: "28px", paddingBottom: "28px", borderLeft: `1px solid ${C.borderWeak}` }}>
                <CompanyScorecard
                  earnings={scorecard.earnings}
                  cashFlows={scorecard.cashFlows}
                  incomeHistory={scorecard.incomeHistory}
                  description={scorecard.description}
                  exchange={scorecard.exchange}
                  lifecycleOnly
                  dividendYield={inp.dividendYield}
                />
              </div>
            )}
          </div>

          {/* Hairline horizontal — before DataSections */}
          <div className="rsp-hairline-h2" style={{ background: C.border, height: "2px" }} />

          {/* Row 5: DataSections — full width */}
          <div className="rsp-data-sections-wrap">
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
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}`, paddingBottom: "32px" }}>
          <p style={{ fontSize: "10px", color: C.text3, margin: 0, textAlign: "center" }}>
            TUP Calculator — For educational purposes only. Not financial advice. Data via Financial Modeling Prep API.
          </p>
        </footer>
        </>)}

      </main>
    </div>
  );
}
