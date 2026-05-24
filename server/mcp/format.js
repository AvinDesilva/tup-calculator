"use strict";

/**
 * Shared formatting for TUP analysis results.
 */

function fmt(n, dec = 2) {
  return n != null ? Number(n).toFixed(dec) : "N/A";
}

function fmtB(n) {
  if (n == null) return "N/A";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

/**
 * Format a TUP result into a readable markdown report.
 * @param {object} data - Company/financial data (ticker, companyName, sector, etc.)
 * @param {object} result - Output from calcTUP (verdict, paybackYears, rows, etc.)
 * @returns {string} Formatted markdown string
 */
function formatTUPResult(data, result) {
  const lines = [
    `# TUP Analysis: ${data.companyName} (${data.ticker})`,
    ``,
    `## Verdict: ${result.verdictLabel}`,
    `**Payback Period: ${result.paybackYears != null ? result.paybackYears + " years" : "N/A"}**`,
    result.paybackNote ? `Note: ${result.paybackNote}` : null,
    result.fallingKnife ? `Warning: Falling Knife — Price ($${fmt(data.currentPrice)}) is below the 200-day SMA ($${fmt(data.sma200)}). Momentum is negative.` : null,
    ``,
    `## Company Overview`,
    `- Sector: ${data.sector || "Unknown"}`,
    `- Industry: ${data.industry || "Unknown"}`,
    data.exchange ? `- Exchange: ${data.exchange}` : null,
    data.lifecycleStage ? `- Lifecycle Stage: ${data.lifecycleStage.replace(/_/g, " ")}` : null,
    ``,
    `## Key Financials`,
    `- Market Cap: ${fmtB(data.marketCap)}`,
    `- Current Price: $${fmt(data.currentPrice)}`,
    `- Adjusted Price (EV/share): $${fmt(result.adjPrice)}`,
    `- TTM EPS: $${fmt(data.ttmEPS, 4)}`,
    `- Forward EPS (consensus): $${fmt(data.forwardEPS, 4)}`,
    `- Blended EPS Base: $${fmt(result.epsBase, 4)}`,
    `- Debt: ${fmtB(data.debt)}`,
    `- Cash: ${fmtB(data.cash)}`,
    `- Dividend Yield: ${fmt(data.dividendYield)}%`,
    data.operatingMargin != null ? `- Operating Margin: ${fmt(data.operatingMargin)}%` : null,
    ``,
    `## Growth Assumptions`,
    `- Historical EPS Growth (CAGR): ${fmt(data.historicalGrowth)}%`,
    `- Forward Growth Y1: ${fmt(data.fwdGrowthY1)}%`,
    data.fwdGrowthY2 != null ? `- Forward Growth Y2: ${fmt(data.fwdGrowthY2)}%` : null,
    `- Blended Growth Rate (used in calc): ${fmt(result.blendedGrowthRate)}%`,
    `- Decay Model: Variable Decay Rate (VDR) — growth fades toward a floor over time`,
    ``,
    `## Payback Schedule (first 15 years)`,
    `| Year | Growth Rate | Annual EPS | Cumulative | Remaining |`,
    `|------|-------------|------------|------------|-----------|`,
    ...result.rows.slice(0, 15).map(r =>
      `| ${r.year} | ${r.growthRate.toFixed(1)}% | $${r.annual.toFixed(2)} | $${r.cum.toFixed(2)} | $${r.remaining.toFixed(2)} |`
    ),
    ``,
    `## How to Interpret`,
    `- The TUP method calculates how many years of compounded EPS growth it takes to "pay back" the enterprise-value-adjusted share price.`,
    `- A shorter payback period means you're getting more earnings power per dollar invested.`,
    `- The growth rate decays over time using the VDR model, reflecting the reality that high growth eventually moderates.`,
    `- Falling knife detection flags stocks where the price is below the 200-day moving average, suggesting negative momentum even if the math looks good.`,
    ``,
    `*Analysis powered by tupcalculator.org.*`,
  ].filter(l => l !== null);

  return lines.join("\n");
}

module.exports = { formatTUPResult, fmt, fmtB };
