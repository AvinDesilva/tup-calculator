import type React from "react";

interface MethodologyPageProps {
  onBack: () => void;
}

export function MethodologyPage({ onBack }: MethodologyPageProps) {
  const M = {
    bg: "#080808", text1: "#e8e4dc", text2: "#888888", text3: "#505050",
    borderWeak: "rgba(255,255,255,0.06)",
    mono: "'JetBrains Mono', monospace",
    display: "'Barlow Condensed', sans-serif",
    serif: "'DM Serif Display', serif",
    body: "'Space Grotesk', system-ui, sans-serif",
  };

  const SubHead = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: M.text3, marginBottom: "12px" }}>{children}</div>
  );

  const FormulaBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
    <div style={{ padding: "16px 20px", borderLeft: "2px solid rgba(196,160,110,0.4)", marginBottom: "20px" }}>
      {label && <SubHead>{label}</SubHead>}
      <div style={{ fontFamily: M.mono, fontSize: "13px", color: M.text1, lineHeight: 2.2 }}>{children}</div>
    </div>
  );

  const CalloutBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
    <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
      {label && <SubHead>{label}</SubHead>}
      <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: 0 }}>{children}</p>
    </div>
  );

  const SectionNum = ({ n, title, sub }: { n: string; title: string; sub?: string }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "28px" }}>
      <span style={{ fontFamily: M.serif, fontWeight: 400, fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 1, color: "#C4A06E", letterSpacing: "-0.03em", flexShrink: 0 }}>{n}</span>
      <div>
        <h2 style={{ fontFamily: M.display, fontWeight: 700, fontSize: "clamp(1.3rem, 3vw, 2rem)", color: M.text1, margin: 0, letterSpacing: "0.02em", textTransform: "uppercase" }}>{title}</h2>
        {sub && <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: M.text3, marginTop: "4px" }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: M.bg, color: M.text1, fontFamily: M.body }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Barlow+Condensed:wght@400;700;900&family=Space+Grotesk:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <div style={{ margin: "0 auto", padding: "0 32px" }}>

        {/* Header */}
        <header style={{ paddingTop: "28px", paddingBottom: "24px", borderBottom: `2px solid #C4A06E`, display: "flex", alignItems: "center", gap: "24px" }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", color: "#C4A06E", cursor: "pointer",
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
            fontFamily: M.body, padding: 0,
          }}>← Back</button>
          <div style={{ width: "1px", height: "20px", background: M.borderWeak, flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: M.serif, fontWeight: 400, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1, letterSpacing: "-0.02em", color: M.text1, margin: 0 }}>
              Standard TUP
            </h1>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: M.text3, marginTop: "4px" }}>
              Growth Analysis Methodology
            </div>
          </div>
        </header>

        {/* Overview */}
        <div style={{ padding: "32px 0 40px", borderBottom: `1px solid ${M.borderWeak}` }}>
          <p style={{ fontSize: "13px", color: M.text2, lineHeight: 1.9, margin: 0 }}>
            TUP uses the average of trailing and forward EPS, compounded at the blended historical + analyst
            growth rate. Annual EPS is summed until cumulative earnings equal the adjusted price. A payback
            period under <strong style={{ color: M.text1 }}>10 years</strong> indicates a buy.
          </p>
        </div>

        {/* 01 Historical EPS Growth */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="01" title="Historical EPS Growth" sub="%" />
          <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            Calculated as the Compound Annual Growth Rate (CAGR) from the company's inception
            (or first year of positive earnings) to the present.
          </p>
          <FormulaBlock label="Formula">
            Historical Growth = [(Current EPS / Initial EPS)<sup style={{ fontSize: "10px" }}>1/n</sup> − 1] × 100
          </FormulaBlock>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {[
              ["Current EPS", "Most recent Trailing Twelve Months (TTM) Diluted EPS"],
              ["Initial EPS",  "EPS from the company's first full year of public data (or first profitable year)"],
              ["n",           "Number of years between those two points"],
            ].map(([term, def]) => (
              <div key={term} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "16px", fontSize: "12px", lineHeight: 1.7 }}>
                <span style={{ fontFamily: M.mono, color: "#00BFA5" }}>{term}</span>
                <span style={{ color: M.text2 }}>{def}</span>
              </div>
            ))}
          </div>
          <CalloutBlock label="Why CAGR over a Simple Average?">
            A simple average of yearly percentages is misleading. If a company grows 100% one year and −50%
            the next, a simple average says 25% growth — but actual EPS is unchanged. CAGR gives the true
            annual rate required to move from Point A to Point B.
          </CalloutBlock>
        </section>

        {/* 02 Analyst Forward Growth */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="02" title="Analyst Forward Growth (2yr)" sub="Consensus Estimate" />
          <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            The consensus view of professional researchers covering the stock — typically the estimated EPS
            growth for the next fiscal year or a 5-year annualized projection.
          </p>
          <FormulaBlock label="Manual Calculation">
            Forward Growth = (Next Year EPS − Current Year EPS) / Current Year EPS × 100
          </FormulaBlock>
          <div style={{ padding: "16px 20px", borderLeft: "2px solid rgba(196,160,110,0.4)", marginBottom: "20px" }}>
            <SubHead>Where to Find It</SubHead>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                ["Yahoo Finance", "Analysis tab → EPS Trend"],
                ["Seeking Alpha", "Earnings estimates section"],
                ["Morningstar",   "Consensus estimates"],
              ].map(([src, loc]) => (
                <div key={src} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "16px", fontSize: "12px", lineHeight: 1.7 }}>
                  <span style={{ fontFamily: M.mono, color: "#00BFA5" }}>{src}</span>
                  <span style={{ color: M.text2 }}>{loc}</span>
                </div>
              ))}
            </div>
          </div>
          <CalloutBlock label="Note on Transition Companies">
            For companies in a business-model transition (e.g. a social platform shifting to e-commerce), the
            5-year estimate is often more useful than the next-year figure — it better captures re-acceleration
            or the steady-state of the new model.
          </CalloutBlock>
        </section>

        {/* 03 TUP Combined Growth Rate */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="03" title="TUP Combined Growth Rate" sub="Blended Assumption" />
          <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            Average the two inputs to produce a blended growth rate. If the company pays a dividend,
            its yield is added on top — because shareholders receive that return regardless of EPS growth.
          </p>
          <FormulaBlock label="Formula">
            Blended Growth = (Historical CAGR + Analyst Forward) / 2<br />
            Total Compounding Rate = Blended Growth + Dividend Yield
          </FormulaBlock>

          <div style={{ border: `1px solid ${M.borderWeak}`, marginBottom: "32px" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${M.borderWeak}` }}>
              <SubHead>Example — Dividend-Paying Company (e.g. NVO)</SubHead>
            </div>
            {[
              ["Historical CAGR (10 yr)",   "20%",   false],
              ["Analyst Forward Estimate",   "15%",   false],
              ["Blended Growth",             "17.5%", false],
              ["Dividend Yield",             "4.9%",  false],
              ["Total Compounding Rate",     "22.4%", true],
            ].map(([label, val, highlight]) => (
              <div key={label as string} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "12px 20px",
                borderBottom: `1px solid ${M.borderWeak}`,
                background: highlight ? "rgba(196,160,110,0.06)" : "transparent",
                borderLeft: highlight ? "2px solid #C4A06E" : "2px solid transparent",
              }}>
                <span style={{ fontSize: "12px", color: highlight ? M.text1 : M.text2, fontWeight: highlight ? 600 : 400 }}>{label}</span>
                <span style={{ fontFamily: M.mono, fontSize: "14px", color: highlight ? "#C4A06E" : M.text1, fontWeight: highlight ? 700 : 400 }}>{val}</span>
              </div>
            ))}
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: 0 }}>
                The 22.4% Total Compounding Rate is applied year-over-year to project EPS until the
                cumulative sum equals the Adjusted Price. The dividend yield is added <em>after</em> the
                average — not inside it — so it doesn't distort the EPS growth signal.
              </p>
            </div>
          </div>

          <SubHead>Key Guardrails</SubHead>
          {[
            ["Dividend Yield Adder", "The yield is added post-blend, not averaged in. This correctly preserves the growth signal: a 4.9% yield on a 17.5% grower produces 22.4% total compounding, not a misleadingly inflated 18% average."],
            ["30% Cap", "Even if the calculation is higher, many analysts cap growth at 30% to account for the law of large numbers — it becomes mathematically impossible to sustain 50%+ growth as a company approaches its Market Cap Ceiling."],
            ["Consistency Check", "If historical growth is 50% but analysts expect 5%, the business model may be broken or the industry is maturing rapidly. In these cases, lean more heavily on the lower number."],
          ].map(([title, bodyText]) => (
            <div key={title as string} style={{ padding: "20px 0", borderTop: `1px solid ${M.borderWeak}` }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: M.text1, marginBottom: "8px" }}>{title}</div>
              <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: 0 }}>{bodyText}</p>
            </div>
          ))}
        </section>

        {/* 04 Dividend Yield */}
        <section style={{ padding: "40px 0" }}>
          <SectionNum n="04" title="Dividend Yield" sub="Total Return Component" />
          <p style={{ fontSize: "12px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            For income-generating companies, the dividend yield represents a guaranteed annual return
            to shareholders independent of share price appreciation. TUP adds it to the compounding
            rate because it effectively accelerates EPS recovery from the investor's perspective.
          </p>
          <FormulaBlock label="Formula">
            Dividend Yield = Annual Dividends Per Share / Current Price × 100
          </FormulaBlock>
          <CalloutBlock label="Why Add It Post-Blend?">
            Averaging the yield in with the two growth rates would dilute the signal from historical
            and analyst EPS estimates. Adding it afterward preserves the integrity of the growth
            analysis while correctly boosting the total compounding rate. A company that grows EPS
            at 17% and pays a 5% dividend is genuinely compounding at 22% for a holder who
            reinvests dividends.
          </CalloutBlock>
          <CalloutBlock label="Auto-Populated">
            When you fetch a ticker, the dividend yield is pulled automatically from the FMP
            profile endpoint. For non-dividend payers it defaults to 0% and has no effect on the
            calculation.
          </CalloutBlock>
        </section>

        <footer style={{ paddingTop: "24px", paddingBottom: "40px", borderTop: `1px solid ${M.borderWeak}` }}>
          <p style={{ fontSize: "10px", color: M.text3, margin: 0 }}>TUP Calculator — For educational purposes only. Not financial advice.</p>
        </footer>
      </div>
    </div>
  );
}
