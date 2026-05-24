#!/usr/bin/env node
"use strict";

/**
 * TUP Calculator MCP Server
 *
 * Exposes stock analysis tools via the Model Context Protocol (MCP).
 * Designed to work with Claude, ChatGPT, Gemini, and other LLM clients
 * that support MCP.
 *
 * Tools:
 *   - analyze_stock: Full TUP (Time Until Payback) analysis for a stock ticker
 *   - search_tickers: Search for stock ticker symbols by company name or symbol
 *
 * Usage:
 *   FMP_API_KEY=your_key node index.js
 *
 * Get a free API key at: https://financialmodelingprep.com/developer/docs
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { calcTUP } = require("./tup.js");
const { searchTickers, lookupTicker } = require("./fmp.js");

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) {
  console.error("Error: FMP_API_KEY environment variable is required.");
  console.error("Get a free API key at: https://financialmodelingprep.com/developer/docs");
  process.exit(1);
}

const server = new McpServer({
  name: "tup-calculator",
  version: "1.0.0",
  description: "Stock valuation tool that calculates Time Until Payback (TUP) — the number of years it takes for a company's compounded earnings to recover your purchase price. Returns a verdict (Deeply Discounted / Fairly Priced / Stretched / Fully Priced / Priced for Perfection) based on payback period thresholds.",
});

// ── analyze_stock tool ──────────────────────────────────────────────────────
server.tool(
  "analyze_stock",
  `Analyze a stock using the Time Until Payback (TUP) method.

Fetches real-time financial data (market cap, EPS, debt, cash, growth rates, analyst estimates) and calculates how many years of compounded earnings growth it takes to recover the enterprise-value-adjusted share price.

Returns a verdict:
  - Deeply Discounted (payback ≤ 7 years): Strong buy signal
  - Fairly Priced (payback ≤ 9 years): Reasonable entry point
  - Stretched (payback ≤ 12 years): Proceed with caution
  - Fully Priced (payback ≤ 15 years): Limited upside
  - Priced for Perfection (payback > 15 years): High risk of overpaying
  - Discounted / Falling Knife: Good math but price is below 200-day SMA — momentum risk

Also detects "falling knife" situations where the stock price is below its 200-day simple moving average.`,
  { ticker: z.string().describe("Stock ticker symbol (e.g., AAPL, MSFT, GOOGL, TSLA)") },
  async ({ ticker }) => {
    try {
      const data = await lookupTicker(ticker, API_KEY);

      if (!data.shares || data.shares <= 0) {
        return {
          content: [{
            type: "text",
            text: `Could not find valid data for ticker "${ticker}". Please check the symbol and try again.`,
          }],
        };
      }

      // Build the input state for calcTUP
      const inp = {
        marketCap: data.marketCap,
        debt: data.debt,
        cash: data.cash,
        shares: data.shares,
        ttmEPS: data.ttmEPS,
        forwardEPS: data.forwardEPS,
        historicalGrowth: data.historicalGrowth,
        analystGrowth: data.analystGrowth,
        fwdGrowthY1: data.fwdGrowthY1,
        fwdGrowthY2: data.fwdGrowthY2,
        revenuePerShare: data.revenuePerShare,
        targetMargin: data.targetMargin,
        inceptionGrowth: data.inceptionGrowth,
        breakEvenYear: data.breakEvenYear,
        currentPrice: data.currentPrice,
        sma200: data.sma200,
        dividendYield: data.dividendYield,
        operatingMargin: data.operatingMargin,
        lifecycleStage: data.lifecycleStage,
        decayMode: "vdr",
        growthOverrides: {},
        fwdCAGR: null,
      };

      const result = calcTUP(inp);

      if (!result) {
        return {
          content: [{
            type: "text",
            text: `Unable to calculate TUP for "${ticker}" — insufficient financial data.`,
          }],
        };
      }

      // Format a comprehensive response
      const fmt = (n, dec = 2) => n != null ? Number(n).toFixed(dec) : "N/A";
      const fmtB = (n) => {
        if (n == null) return "N/A";
        if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
        if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
        if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
        return `$${n.toFixed(2)}`;
      };

      const lines = [
        `# TUP Analysis: ${data.companyName} (${data.ticker})`,
        ``,
        `## Verdict: ${result.verdictLabel}`,
        `**Payback Period: ${result.paybackYears != null ? result.paybackYears + " years" : "N/A"}**`,
        result.paybackNote ? `Note: ${result.paybackNote}` : null,
        result.fallingKnife ? `⚠️ Falling Knife Warning: Price ($${fmt(data.currentPrice)}) is below the 200-day SMA ($${fmt(data.sma200)}). Momentum is negative.` : null,
        ``,
        `## Company Overview`,
        `- Sector: ${data.sector}`,
        `- Industry: ${data.industry}`,
        `- Exchange: ${data.exchange}`,
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
        `*Data sourced from Financial Modeling Prep. Analysis powered by tupcalculator.org.*`,
      ].filter(l => l !== null);

      return {
        content: [{
          type: "text",
          text: lines.join("\n"),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `Error analyzing "${ticker}": ${err.message}`,
        }],
        isError: true,
      };
    }
  }
);

// ── search_tickers tool ──────────────────────────────────────────────────────
server.tool(
  "search_tickers",
  `Search for stock ticker symbols by company name or partial symbol. Returns up to 10 matching results with symbol, company name, exchange, and currency. Use this to find the correct ticker symbol before running analyze_stock.`,
  { query: z.string().describe("Company name or partial ticker symbol to search for (e.g., 'Apple', 'Tesla', 'MSFT')") },
  async ({ query }) => {
    try {
      const results = await searchTickers(query, API_KEY);

      if (!results.length) {
        return {
          content: [{
            type: "text",
            text: `No ticker symbols found matching "${query}".`,
          }],
        };
      }

      const lines = [
        `Found ${results.length} result(s) for "${query}":`,
        ``,
        `| Symbol | Company | Exchange |`,
        `|--------|---------|----------|`,
        ...results.map(r => `| ${r.symbol} | ${r.name} | ${r.exchange} |`),
      ];

      return {
        content: [{
          type: "text",
          text: lines.join("\n"),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `Error searching for "${query}": ${err.message}`,
        }],
        isError: true,
      };
    }
  }
);

// ── Start server ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
