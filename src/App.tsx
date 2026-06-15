import { useState, useMemo, useCallback, useEffect } from "react";

import { calcTUP } from "./lib/verdictCard/calcTUP.ts";
import { C } from "./lib/theme.ts";
import type { Mode, TUPResult, GrowthScenario, PriceMode } from "./lib/types.ts";

import { VerdictCard } from "./components/VerdictCard";
import { ValuationContext } from "./components/ValuationContext";
import { CompanyScorecard } from "./components/CompanyScorecard";
import { InsiderTradingTable } from "./components/InsiderTradingTable";
import { MobileSummary } from "./components/MobileSummary";
import { MethodologyPage } from "./components/MethodologyPage";
import { IntegrationGuide } from "./components/IntegrationGuide";
import { Masthead } from "./components/Masthead";
import { HeroSearch } from "./components/HeroSearch";
import { CompactTickerBar } from "./components/CompactTickerBar";
import { DataSections } from "./components/DataSections";
import { YearByYearBreakdown } from "./components/DataSections/YearByYearBreakdown";
import { PriceProjectionGraph } from "./components/PriceProjectionGraph";
import { Backtesting } from "./components/Backtesting";
import { TabNav } from "./components/TabNav";
import type { Tab } from "./components/TabNav";
import { useTickerFetch } from "./hooks/useTickerFetch.ts";
import { AuthModal } from "./components/Auth";
import { WatchlistPage } from "./components/Watchlist/WatchlistPage.tsx";
import { WatchlistButton } from "./components/Watchlist/WatchlistButton.tsx";
import { SignupPrompt } from "./components/SignupPrompt/SignupPrompt.tsx";
import { useAuth } from "./contexts/useAuth.ts";
import { useSearchCount, URL_TICKER } from "./hooks/useSearchCount.ts";
import * as watchlistApi from "./lib/api/watchlist.ts";
import type { WatchlistItem } from "./lib/api/watchlist.ts";
import "./App.css";

export default function App() {
  const {
    // Search / dice UI
    ticker, setTicker, loading, error, retryAfter, fetchLog,
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

  const { isAuthenticated } = useAuth();
  const { incrementSearchCount, shouldShowPrompt, dismissPrompt } = useSearchCount();

  const [showMethodology, setShowMethodology] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [priceMode, setPriceMode] = useState<PriceMode>("adj");
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [animationKey, setAnimationKey] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
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

  // Load watchlist when authenticated
  const refreshWatchlist = useCallback(() => {
    if (!isAuthenticated) { setWatchlist([]); return; }
    watchlistApi.getWatchlist().then(setWatchlist).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    // Sync watchlist from server when auth state changes
    let cancelled = false;
    if (!isAuthenticated) {
      // Clear watchlist in a microtask to avoid sync setState in effect
      Promise.resolve().then(() => { if (!cancelled) setWatchlist([]); });
      return () => { cancelled = true; };
    }
    watchlistApi.getWatchlist()
      .then(items => { if (!cancelled) setWatchlist(items); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const isInWatchlist = useCallback((t: string) => watchlist.some(w => w.ticker === t.toUpperCase()), [watchlist]);

  // Auto-fetch ticker from ?t= URL param on first load
  useEffect(() => {
    if (URL_TICKER) {
      setTicker(URL_TICKER);
      doFetch(URL_TICKER);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSignIn = useCallback(() => { setAuthModalTab("login"); setShowAuthModal(true); }, []);
  const openRegister = useCallback(() => { setAuthModalTab("register"); setShowAuthModal(true); }, []);

  const handleFetch = (sym?: string) => {
    setPriceMode("adj");
    setActiveTab("analysis");
    setAnimationKey(k => k + 1);
    doFetch(sym);
    incrementSearchCount();
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleGrowthStep = (d: number) => {
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
  };

  const handleGrowthSet = (val: number) => {
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
  };

  const onScenarioChange = (s: GrowthScenario) => {
    setGrowthScenario(s);
    const v = scenarioValues[s];
    setInp(p => ({ ...p, fwdGrowthY1: v.y1, fwdGrowthY2: v.y2, fwdCAGR: v.cagr, growthOverrides: {} }));
  };

  if (showMethodology) return <MethodologyPage onBack={() => setShowMethodology(false)} />;
  if (showIntegration) return <IntegrationGuide onBack={() => setShowIntegration(false)} />;

  if (showWatchlist) return (
    <WatchlistPage
      items={watchlist}
      onBack={() => setShowWatchlist(false)}
      onSelectTicker={(t) => { setShowWatchlist(false); setTicker(t); handleFetch(t); }}
      onRemove={(t) => {
        watchlistApi.removeFromWatchlist(t).then(refreshWatchlist).catch(() => {});
      }}
    />
  );

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
          onShowIntegration={() => { setShowIntegration(true); setIsFilterOpen(false); window.scrollTo(0, 0); }}
          onReset={hasSearched ? () => { resetSearch(); window.scrollTo(0, 0); } : undefined}
          onSignIn={openSignIn}
          onWatchlist={() => setShowWatchlist(true)}
        />

        {!hasSearched && (
          <HeroSearch
            ticker={ticker}
            onTickerChange={setTicker}
            onTickerSelect={(sym: string) => { setTicker(sym); handleFetch(sym); }}
            onFetch={handleFetch}
            loading={loading}
            error={error}
            retryAfter={retryAfter}
            onRollDice={() => { setPriceMode("adj"); setAnimationKey(k => k + 1); rollDice(); }}
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
              retryAfter={retryAfter}
              fetchLog={fetchLog}
              onRollDice={() => { setPriceMode("adj"); setAnimationKey(k => k + 1); rollDice(); }}
              onCancelDice={cancelDice}
              rollingDice={rollingDice}
              dicePhrase={dicePhrase}

              isFilterOpen={isFilterOpen}
              onToggleFilter={() => setIsFilterOpen(o => !o)}
              rollFilters={rollFilters}
              onApplyFilters={setRollFilters}
              onResetFilters={() => setRollFilters({ marketCap: [], sector: "", exchange: [], indexEtf: "", tupRange: [] })}
              hasActiveFilters={hasActiveFilters}
              watchlistSlot={company && (
                <WatchlistButton
                  ticker={ticker}
                  isInWatchlist={isInWatchlist(ticker)}
                  isAuthenticated={isAuthenticated}
                  onToggle={() => {
                    if (!isAuthenticated) { openSignIn(); return; }
                    if (isInWatchlist(ticker)) {
                      watchlistApi.removeFromWatchlist(ticker).then(refreshWatchlist).catch(() => {});
                    } else {
                      watchlistApi.addToWatchlist({
                        ticker,
                        companyName: company,
                        paybackYears: result?.payback ?? null,
                        verdict: result?.verdict ?? null,
                        sma200Cleared: inp.currentPrice > inp.sma200,
                        currentPrice: inp.currentPrice,
                        sma200: inp.sma200,
                        adjPrice: result?.adjPrice ?? null,
                        growthRate: result?.gr ?? null,
                        epsBase: result?.epsBase ?? null,
                      }).then(refreshWatchlist).catch(() => {});
                    }
                  }}
                />
              )}
            />
            <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        )}

        {hasSearched && activeTab === "analysis" && (
          <>
          <div className="rsp-main-grid" style={{ display: "grid", gridTemplateColumns: "max-content 2px 1fr", gridTemplateRows: "auto 2px auto auto", gap: "0", alignItems: "start", paddingTop: "12px" }}>

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

              <VerdictCard result={result} noiseFilter={false} currentPrice={inp.currentPrice} animationKey={animationKey}
                companyName={company}
                growthScenario={growthScenario}
                onScenarioChange={onScenarioChange}
                hasScenarioData={hasScenarioData}
                priceMode={priceMode}
                onPriceModeToggle={() => setPriceMode(m => m === "adj" ? "listed" : "adj")}
                onGrowthStep={handleGrowthStep}
                onGrowthSet={handleGrowthSet} />

            </div>

            {/* Hairline vertical */}
            <div className="rsp-hairline-v" style={{ background: C.border, width: "2px" }} />

            {/* Col 3: Price Projection Graph */}
            <div className="rsp-right-graph" style={{ paddingLeft: "40px", paddingRight: "0", paddingTop: "7px", paddingBottom: "28px", animation: "fadeInUp 0.5s 0.2s ease both", alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
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
            <MobileSummary
              result={result}
              currentPrice={inp.currentPrice}
              adjPrice={result?.adjPrice}
              priceMode={priceMode}
              onPriceModeToggle={() => setPriceMode(m => m === "adj" ? "listed" : "adj")}
              onGrowthStep={handleGrowthStep}
            />

            {/* Price targets row — visible on all screen sizes */}
            {(displayStrongBuyPrice != null || displayBuyPrice != null) && (() => {
              const refPrice = priceMode === "listed" ? inp.currentPrice : result?.adjPrice;
              const fmtDiff = (target: number) => {
                if (!refPrice || refPrice <= 0) return "";
                const pct = ((target - refPrice) / refPrice) * 100;
                return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
              };
              const sbColor = displayStrongBuyPrice != null && inp.currentPrice > 0 && inp.currentPrice > displayStrongBuyPrice ? "#10d97e" : "#f5a020";
              const bColor  = displayBuyPrice != null && inp.currentPrice > 0 && inp.currentPrice > displayBuyPrice ? "#10d97e" : "#f5a020";
              return (
                <div className="rsp-price-targets-row" style={{ display: "flex", justifyContent: "space-around", padding: "12px 0 12px", borderTop: `1px solid ${C.borderWeak}` }}>
                  {displayStrongBuyPrice != null && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Deeply Discounted Below</div>
                      <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: sbColor }}>${displayStrongBuyPrice.toFixed(2)}</div>
                      <div style={{ fontSize: "10px", color: "#666", marginTop: "2px", fontFamily: C.mono }}>{fmtDiff(displayStrongBuyPrice)}</div>
                    </div>
                  )}
                  {displayBuyPrice != null && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Fairly Priced Below</div>
                      <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: bColor }}>${displayBuyPrice.toFixed(2)}</div>
                      <div style={{ fontSize: "10px", color: "#666", marginTop: "2px", fontFamily: C.mono }}>{fmtDiff(displayBuyPrice)}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div style={{ borderTop: `1px solid ${C.borderWeak}`, paddingTop: "12px" }}>
            <YearByYearBreakdown
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
          </>
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
              showPriceTargets={false}
              metricHistory={{
                incomeHistory: scorecard.incomeHistory,
                cashFlowHistory: scorecard.cashFlows,
                balanceSheetHistory: scorecard.balanceSheetHistory,
                priceHistory,
                epsGrowthHistory: scorecard.epsGrowthHistory,
                shares: inp.shares,
              }}
            />
          </div>
        )}

        {hasSearched && activeTab === "profile" && (
          <div style={{ animation: "fadeInUp 0.5s 0.1s ease both", paddingTop: "16px", paddingBottom: "28px" }}>
            {company ? (
              <>
                <CompanyScorecard
                  cashFlows={scorecard.cashFlows}
                  incomeHistory={scorecard.incomeHistory}
                  description={scorecard.description}
                  dividendYield={inp.dividendYield}
                />
                <InsiderTradingTable
                  data={valuation.insiderTrading}
                  loading={valuation.insiderTradingLoading}
                  fetchedAt={valuation.insiderTradingFetchedAt}
                />
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
            />
          </div>
        )}

        {hasSearched && activeTab === "backtest" && company && (
          <Backtesting
            ticker={ticker}
            incomeHistory={scorecard.incomeHistory}
            balanceSheetHistory={scorecard.balanceSheetHistory}
            cashFlowHistory={scorecard.cashFlows}
            priceHistory={priceHistory}
            shares={inp.shares}
          />
        )}

        {hasSearched && (
          <footer style={{ marginTop: "32px", paddingTop: "16px", borderTop: `1px solid ${C.borderWeak}`, paddingBottom: "32px" }}>
            <p style={{ fontSize: "10px", color: C.text3, margin: 0, textAlign: "center" }}>
              TUP Calculator — For educational purposes only. Not financial advice. Data via Financial Modeling Prep API.
            </p>
          </footer>
        )}

      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialTab={authModalTab} />

      {shouldShowPrompt && (
        <SignupPrompt
          onCreateAccount={openRegister}
          onDismiss={dismissPrompt}
        />
      )}
    </div>
  );
}
