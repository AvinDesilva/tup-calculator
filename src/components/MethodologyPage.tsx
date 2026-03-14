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
    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: M.text3, marginBottom: "12px" }}>{children}</div>
  );

  const FormulaBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
    <div style={{ padding: "16px 20px", borderLeft: "2px solid rgba(196,160,110,0.4)", marginBottom: "20px" }}>
      {label && <SubHead>{label}</SubHead>}
      <div style={{ fontFamily: M.mono, fontSize: "14px", color: M.text1, lineHeight: 2.2 }}>{children}</div>
    </div>
  );

  const CalloutBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
    <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
      {label && <SubHead>{label}</SubHead>}
      <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: 0 }}>{children}</p>
    </div>
  );

  const SectionNum = ({ n, title, sub }: { n: string; title: string; sub?: string }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "28px" }}>
      <span style={{ fontFamily: M.serif, fontWeight: 400, fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 1, color: "#C4A06E", letterSpacing: "-0.03em", flexShrink: 0 }}>{n}</span>
      <div>
        <h2 style={{ fontFamily: M.display, fontWeight: 700, fontSize: "clamp(1.3rem, 3vw, 2rem)", color: M.text1, margin: 0, letterSpacing: "0.02em", textTransform: "uppercase" }}>{title}</h2>
        {sub && <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: M.text3, marginTop: "4px" }}>{sub}</div>}
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
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
            fontFamily: M.body, padding: 0,
          }}>← Back</button>
          <div style={{ width: "1px", height: "20px", background: M.borderWeak, flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: M.serif, fontWeight: 400, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1, letterSpacing: "-0.02em", color: M.text1, margin: 0 }}>
              Standard TUP
            </h1>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: M.text3, marginTop: "4px" }}>
              Growth Analysis Methodology
            </div>
          </div>
        </header>

        {/* Overview */}
        <div style={{ padding: "32px 0 40px", borderBottom: `1px solid ${M.borderWeak}` }}>
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.9, margin: 0 }}>
            TUP (Time Until Payback) measures how many years of a company's earnings it takes to
            recover what you paid for the stock. It starts with the <strong style={{ color: M.text1 }}>blended
            EPS</strong> (average of trailing and forward estimates) as the base, compounds it year over year
            using a growth rate that <strong style={{ color: M.text1 }}>decays dynamically</strong> based on the
            company's lifecycle stage, and counts until the cumulative total equals the adjusted price — if
            payback arrives in under{" "}
            <strong style={{ color: M.text1 }}>10 years</strong>, the stock is a buy.
          </p>
        </div>

        {/* 01 Adjusted Share Price */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="01" title="Adjusted Share Price" sub="Enterprise Value Per Share" />
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            Before comparing earnings against the stock price, TUP adjusts for the company's balance sheet.
            Debt is added because it represents obligations that must be serviced before shareholders see returns,
            while cash is subtracted because it's already owned by shareholders. The result is the enterprise
            value per share — the true cost an investor is paying for the business.
          </p>
          <FormulaBlock label="Formula">
            Adjusted Price = (Market Cap + Total Debt − Cash) / Shares Outstanding
          </FormulaBlock>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {[
              ["Market Cap", "Current share price × total shares outstanding"],
              ["Total Debt", "All short-term and long-term borrowings on the balance sheet"],
              ["Cash", "Cash and cash equivalents (liquid assets immediately available)"],
              ["Shares", "Diluted shares outstanding"],
            ].map(([term, def]) => (
              <div key={term} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "16px", fontSize: "14px", lineHeight: 1.7 }}>
                <span style={{ fontFamily: M.mono, color: "#00BFA5" }}>{term}</span>
                <span style={{ color: M.text2 }}>{def}</span>
              </div>
            ))}
          </div>
          <CalloutBlock label="Why Not Just Use the Stock Price?">
            Two companies trading at $100/share may have very different enterprise values. A company
            with $50B in debt is far more expensive to "own" than one with $50B in cash — even if
            their market caps are identical. The adjusted price captures this difference.
          </CalloutBlock>
        </section>

        {/* 02 Historical EPS Growth */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="02" title="Historical EPS Growth" sub="CAGR + Absolute Delta" />
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            Derived from diluted EPS on the income statement (net income ÷ shares). TUP uses a{" "}
            <strong style={{ color: M.text1 }}>two-path approach</strong> depending on whether the
            starting EPS was positive or negative.
          </p>

          <SubHead>Path A — Standard CAGR (Base EPS &gt; 0)</SubHead>
          <FormulaBlock>
            Growth = [(EPS<sub>end</sub> / EPS<sub>begin</sub>)<sup style={{ fontSize: "11px" }}>1/n</sup> − 1] × 100
          </FormulaBlock>

          <SubHead>Path B — Absolute Delta (Base EPS ≤ 0)</SubHead>
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 16px" }}>
            The standard CAGR breaks when the starting EPS is zero or negative. For turnaround companies
            that transitioned from losses to profitability, TUP uses the Absolute Delta method instead:
          </p>
          <FormulaBlock>
            Growth<sub>mod</sub> = (EPS<sub>end</sub> − EPS<sub>begin</sub>) / (|EPS<sub>begin</sub>| × n) × 100
          </FormulaBlock>
          <p style={{ fontSize: "14px", color: M.text3, lineHeight: 1.7, margin: "0 0 24px", fontStyle: "italic" }}>
            If |EPS<sub>begin</sub>| is exactly 0, a floor of $0.01 is used to prevent division by zero.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {[
              ["EPS_end",   "Most recent fiscal year diluted EPS"],
              ["EPS_begin", "Farthest available year (up to 5 or 10 years back)"],
              ["n",         "Number of years between those two points"],
            ].map(([term, def]) => (
              <div key={term} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "16px", fontSize: "14px", lineHeight: 1.7 }}>
                <span style={{ fontFamily: M.mono, color: "#00BFA5" }}>{term}</span>
                <span style={{ color: M.text2 }}>{def}</span>
              </div>
            ))}
          </div>

          <CalloutBlock label="Why Two Paths?">
            A company like HIMS with EPS going from −$0.50 to +$1.50 over 3 years has genuine
            compounding momentum, but the standard CAGR formula returns NaN for a negative base.
            The Absolute Delta method normalizes the total swing against the starting magnitude, giving
            a meaningful growth rate that feeds correctly into the lifecycle fade model.
          </CalloutBlock>

          <CalloutBlock label="No Hard Cap">
            Historical growth is <em>not</em> capped at a fixed ceiling. Instead, the{" "}
            <strong style={{ color: M.text1 }}>Variable Decay Rate</strong> in Step 05 ensures that
            hyper-growth rates are reduced more aggressively over time — making a hard cap redundant.
          </CalloutBlock>
        </section>

        {/* 03 Analyst Forward Growth */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="03" title="Analyst Forward Growth (2yr)" sub="Consensus Estimate" />
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
            The consensus view of professional researchers covering the stock — typically the estimated EPS
            growth for the next fiscal year or a 2-year annualized projection. This is blended with the
            historical CAGR to produce the final growth rate used in the payback calculation.
          </p>
          <FormulaBlock label="Primary (Estimate-to-Estimate)">
            Analyst Growth = (EPS<sub>T+1</sub> − EPS<sub>T</sub>) / EPS<sub>T</sub>
          </FormulaBlock>
          <p style={{ fontSize: "14px", color: M.text3, lineHeight: 1.7, margin: "-8px 0 20px", fontStyle: "italic" }}>
            Where EPS<sub>T</sub> is the current fiscal year estimate and EPS<sub>T+1</sub> is the next fiscal year estimate.
            Both come from the same analyst data source, ensuring a consistent accounting basis.
          </p>
          <CalloutBlock label="Revenue Fallback">
            If analyst EPS estimates are unavailable, TUP falls back to
            analyst <em>revenue</em> estimates using the same CAGR formula. If no estimates are available
            at all, the analyst growth defaults to 80% of the historical CAGR.
          </CalloutBlock>

          <SubHead>Forward Growth Components: Y1, Y2, and Terminal Rate</SubHead>
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 20px" }}>
            When analyst estimates are available for multiple years, TUP derives three distinct forward growth
            rates that feed into the year-by-year payback table. This produces a more realistic trajectory than
            applying a single flat rate — growth typically decelerates as a company scales.
          </p>

          <FormulaBlock label="Y1 Growth — (EPS_T+1 / EPS_T) − 1">
            G1 = (EPS<sub>T+1</sub> − EPS<sub>T</sub>) / EPS<sub>T</sub>
          </FormulaBlock>
          <p style={{ fontSize: "14px", color: M.text3, lineHeight: 1.7, margin: "-8px 0 20px", fontStyle: "italic" }}>
            Growth from the current fiscal year estimate to the next fiscal year estimate.
            Both values come from analyst consensus (same accounting basis), avoiding GAAP vs adjusted
            EPS mismatches that would inflate the rate.
          </p>

          <FormulaBlock label="Y2 Growth — (EPS_T+2 / EPS_T+1) − 1">
            G2 = (EPS<sub>T+2</sub> − EPS<sub>T+1</sub>) / EPS<sub>T+1</sub>
          </FormulaBlock>
          <p style={{ fontSize: "14px", color: M.text3, lineHeight: 1.7, margin: "-8px 0 20px", fontStyle: "italic" }}>
            Growth from the next fiscal year to the year after. This often differs meaningfully from
            G1 — a company accelerating out of a down cycle may show G2 &gt; G1, while a maturing
            company typically shows G2 &lt; G1. Requires a third year of estimates.
          </p>

          <FormulaBlock label="Terminal Forward CAGR">
            CAGR = (EPS<sub>T+2</sub> / EPS<sub>T</sub>)<sup style={{ fontSize: "11px" }}>1/3</sup> − 1
          </FormulaBlock>
          <p style={{ fontSize: "14px", color: M.text3, lineHeight: 1.7, margin: "-8px 0 20px", fontStyle: "italic" }}>
            The annualized growth rate across all available estimate years. This smooths G1 and G2 into a single
            rate used for Year 3 onward, blended with historical growth, until the lifecycle fade model takes over.
            Falls back to a 2-year span when only two years of estimates exist.
          </p>

          <CalloutBlock label="Bear / Base / Bull Scenarios">
            Analyst estimates include low, average, and high EPS projections. TUP precomputes all three
            scenarios at fetch time — the <strong style={{ color: "#FF4D00" }}>bear</strong> case uses{" "}
            <span style={{ fontFamily: M.mono }}>epsLow</span>,{" "}
            <strong style={{ color: M.text1 }}>base</strong> uses{" "}
            <span style={{ fontFamily: M.mono }}>epsAvg</span>, and{" "}
            <strong style={{ color: "#00897B" }}>bull</strong> uses{" "}
            <span style={{ fontFamily: M.mono }}>epsHigh</span>. Toggling between them swaps
            the Y1, Y2, and CAGR values, which flows through the entire payback calculation automatically.
          </CalloutBlock>

          <CalloutBlock label="Why Blend Historical + Analyst?">
            Historical growth shows what the company has actually achieved; analyst estimates show what the
            market expects going forward. Averaging the two tempers over-optimistic projections while still
            capturing forward momentum — especially useful for companies entering a new growth phase.
          </CalloutBlock>
        </section>

        {/* 04 Dividend Yield */}
        <section style={{ padding: "40px 0", borderBottom: `1px solid ${M.borderWeak}` }}>
          <SectionNum n="04" title="Dividend Yield" sub="Total Return Component" />
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
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

        {/* 05 TUP Combined Growth Rate */}
        <section style={{ padding: "40px 0" }}>
          <SectionNum n="05" title="TUP Combined Growth Rate" sub="Blended Assumption" />
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 24px" }}>
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
                <span style={{ fontSize: "14px", color: highlight ? M.text1 : M.text2, fontWeight: highlight ? 600 : 400 }}>{label}</span>
                <span style={{ fontFamily: M.mono, fontSize: "15px", color: highlight ? "#C4A06E" : M.text1, fontWeight: highlight ? 700 : 400 }}>{val}</span>
              </div>
            ))}
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: 0 }}>
                The 22.4% Total Compounding Rate is applied year-over-year to project EPS until the
                cumulative sum equals the Adjusted Price. The dividend yield is added <em>after</em> the
                average — not inside it — so it doesn't distort the EPS growth signal.
              </p>
            </div>
          </div>

          <SubHead>Lifecycle Fade with Variable Decay Rate</SubHead>
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 20px" }}>
            Rather than applying a flat growth cap, TUP uses a <strong style={{ color: M.text1 }}>Lifecycle Fade</strong> model
            with a <strong style={{ color: M.text1 }}>Variable Decay Rate (VDR)</strong> that scales
            with the initial growth rate. Hyper-growth companies face more aggressive annual reduction,
            while moderate growers decay gracefully — eliminating the need for a hard cap.
          </p>
          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 20px" }}>
            First, the company is classified into one of six lifecycle stages using its most recent revenue growth and profitability.
            Earlier-stage companies get longer hold periods because their high growth rates are expected to persist — a start-up
            reinvesting heavily has years of runway ahead, while a mature company's growth is already near its ceiling.
          </p>
          <div style={{ border: `1px solid ${M.borderWeak}`, marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "12px", padding: "8px 20px", background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${M.borderWeak}` }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: M.text3 }}>Stage</span>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: M.text3 }}>Criteria</span>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: M.text3, textAlign: "right" }}>Hold Period</span>
            </div>
            {([
              ["Start-Up",       "Not yet profitable (any revenue growth)",  "7 years", "#C4A06E"],
              ["Young Growth",   "Profitable, revenue growth > 30%",        "5 years", "#a8d844"],
              ["High Growth",    "Profitable, revenue growth > 15%",        "3 years", "#10d97e"],
              ["Mature Growth",  "Profitable, revenue growth > 5%",         "1 year",  "#00BFA5"],
              ["Mature Stable",  "Profitable, revenue growth 0–5%",         "0 years", "#4a90d9"],
              ["Decline",        "Revenue growth < 0%",                     "0 years", "#FF4D00"],
            ] as [string, string, string, string][]).map(([stage, criteria, hold, color]) => (
              <div key={stage} style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "12px", alignItems: "baseline",
                padding: "12px 20px", borderBottom: `1px solid ${M.borderWeak}`,
              }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color }}>{stage}</span>
                <span style={{ fontSize: "14px", color: M.text2 }}>{criteria}</span>
                <span style={{ fontFamily: M.mono, fontSize: "14px", color: "#C4A06E", textAlign: "right" }}>{hold}</span>
              </div>
            ))}
          </div>
          <CalloutBlock label="Why 6 Stages?">
            The original 4-stage model (Introduction, Growth, Maturity, Decline) grouped too many different
            business profiles together. A company growing revenue at 40% and one growing at 8% both landed in
            the same bucket. The 6-stage model separates these cases — a Young Growth company (30%+ revenue growth)
            gets 5 years of full-rate compounding, while a Mature Growth company (5–15%) only gets 1 year before
            decay begins. This produces more realistic long-term projections.
          </CalloutBlock>

          <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: "0 0 16px" }}>
            During the <strong style={{ color: M.text1 }}>Hold Period</strong>, the initial blended growth rate is
            maintained at full strength. After the hold period expires, the rate decays annually using a
            Variable Decay Rate that scales with the initial growth:
          </p>

          <FormulaBlock label="Variable Decay Rate">
            VDR = max( 5%, G<sub>initial</sub> × 20% )
          </FormulaBlock>

          <FormulaBlock label="Lifecycle Fade Formula">
            G(n) = max( G<sub>initial</sub> − (n − HoldPeriod) × VDR, &nbsp;30% )
          </FormulaBlock>

          <div style={{ border: `1px solid ${M.borderWeak}`, marginBottom: "32px" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${M.borderWeak}` }}>
              <SubHead>Example A — Pre-Profit Start-Up (70% initial, Start-Up stage)</SubHead>
            </div>
            {[
              ["VDR",                       "max(5%, 70% × 20%) = 14%", false],
              ["Years 1–7 (hold)",          "70%",                      false],
              ["Year 8",                    "70% − 14% = 56%",         false],
              ["Year 9",                    "56% − 14% = 42%",         false],
              ["Year 10+",                  "30% floor",               true],
            ].map(([label, val, highlight]) => (
              <div key={label as string} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "12px 20px",
                borderBottom: `1px solid ${M.borderWeak}`,
                background: highlight ? "rgba(196,160,110,0.06)" : "transparent",
                borderLeft: highlight ? "2px solid #C4A06E" : "2px solid transparent",
              }}>
                <span style={{ fontSize: "14px", color: highlight ? M.text1 : M.text2, fontWeight: highlight ? 600 : 400 }}>{label}</span>
                <span style={{ fontFamily: M.mono, fontSize: "15px", color: highlight ? "#C4A06E" : M.text1, fontWeight: highlight ? 700 : 400 }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ border: `1px solid ${M.borderWeak}`, marginBottom: "32px" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${M.borderWeak}` }}>
              <SubHead>Example B — Young Growth Company (35% initial, Young Growth stage)</SubHead>
            </div>
            {[
              ["VDR",                       "max(5%, 35% × 20%) = 7%", false],
              ["Years 1–5 (hold)",          "35%",                     false],
              ["Year 6",                    "35% − 7% = 28% → 30% floor", false],
              ["Year 7+",                   "30% floor",               true],
            ].map(([label, val, highlight]) => (
              <div key={label as string} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "12px 20px",
                borderBottom: `1px solid ${M.borderWeak}`,
                background: highlight ? "rgba(196,160,110,0.06)" : "transparent",
                borderLeft: highlight ? "2px solid #C4A06E" : "2px solid transparent",
              }}>
                <span style={{ fontSize: "14px", color: highlight ? M.text1 : M.text2, fontWeight: highlight ? 600 : 400 }}>{label}</span>
                <span style={{ fontFamily: M.mono, fontSize: "15px", color: highlight ? "#C4A06E" : M.text1, fontWeight: highlight ? 700 : 400 }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ border: `1px solid ${M.borderWeak}`, marginBottom: "32px" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${M.borderWeak}` }}>
              <SubHead>Example C — Mature Growth Blue-Chip (12% initial, Mature Growth stage)</SubHead>
            </div>
            {[
              ["VDR",                       "max(5%, 12% × 20%) = 5%", false],
              ["Year 1 (hold)",             "12%",                     false],
              ["Year 2",                    "12% − 5% = 7%",          false],
              ["Year 3+",                   "7% (below 30% floor — no fade applied)", true],
            ].map(([label, val, highlight]) => (
              <div key={label as string} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "12px 20px",
                borderBottom: `1px solid ${M.borderWeak}`,
                background: highlight ? "rgba(196,160,110,0.06)" : "transparent",
                borderLeft: highlight ? "2px solid #C4A06E" : "2px solid transparent",
              }}>
                <span style={{ fontSize: "14px", color: highlight ? M.text1 : M.text2, fontWeight: highlight ? 600 : 400 }}>{label}</span>
                <span style={{ fontFamily: M.mono, fontSize: "15px", color: highlight ? "#C4A06E" : M.text1, fontWeight: highlight ? 700 : 400 }}>{val}</span>
              </div>
            ))}
          </div>

          <CalloutBlock>
            The VDR ensures that extreme growth rates (from turnaround stocks or high-growth disruptors)
            are pulled toward reality faster, while companies with steady 30–40% growth hold their rate
            longer. No hard ceiling is needed — the math self-corrects.
          </CalloutBlock>

          <SubHead>Key Guardrails</SubHead>
          {[
            ["Dividend Yield Adder", "The yield is added post-blend, not averaged in. This correctly preserves the growth signal: a 4.9% yield on a 17.5% grower produces 22.4% total compounding, not a misleadingly inflated 18% average."],
            ["30% Floor", "The VDR decay never pushes the growth rate below 30%. This floor reflects a reasonable long-term compounding assumption — aggressive enough to reward quality businesses, conservative enough to avoid fantasy projections."],
            ["Consistency Check", "If historical growth is 50% but analysts expect 5%, the business model may be broken or the industry is maturing rapidly. In these cases, lean more heavily on the lower number."],
          ].map(([title, bodyText]) => (
            <div key={title as string} style={{ padding: "20px 0", borderTop: `1px solid ${M.borderWeak}` }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: M.text1, marginBottom: "8px" }}>{title}</div>
              <p style={{ fontSize: "15px", color: M.text2, lineHeight: 1.85, margin: 0 }}>{bodyText}</p>
            </div>
          ))}
        </section>

        <footer style={{ paddingTop: "24px", paddingBottom: "40px", borderTop: `1px solid ${M.borderWeak}` }}>
          <p style={{ fontSize: "11px", color: M.text3, margin: 0 }}>TUP Calculator — For educational purposes only. Not financial advice.</p>
        </footer>
      </div>
    </div>
  );
}
