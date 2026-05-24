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
 *   - analyze_stock: Full TUP analysis — fetches data + calculates (requires FMP_API_KEY)
 *   - calculate_tup: Pure TUP calculation from pre-fetched data (no API key needed)
 *   - search_tickers: Search for stock ticker symbols (requires FMP_API_KEY)
 *
 * Modes:
 *   Standalone:  FMP_API_KEY=your_key node index.js   (all 3 tools available)
 *   Paired:      node index.js                         (calculate_tup only — pair with FMP MCP Server)
 *
 * The "paired" mode is designed for users who already have the FMP MCP Server
 * (financial-modeling-prep-mcp-server) installed. The LLM fetches data via the
 * FMP MCP, then passes it to calculate_tup — no duplicate API calls.
 *
 * Get a free FMP API key at: https://financialmodelingprep.com/developer/docs
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { calcTUP } = require("./tup.js");
const { searchTickers, lookupTicker } = require("./fmp.js");
const { formatTUPResult } = require("./format.js");

const API_KEY = process.env.FMP_API_KEY || null;
const HAS_API_KEY = !!API_KEY;

if (!HAS_API_KEY) {
  console.error("[tup-mcp] No FMP_API_KEY set — running in paired mode (calculate_tup only).");
  console.error("[tup-mcp] For standalone mode with analyze_stock + search_tickers, set FMP_API_KEY.");
}

const server = new McpServer({
  name: "tup-calculator",
  version: "1.1.0",
  description: "Stock valuation tool that calculates Time Until Payback (TUP) — the number of years it takes for a company's compounded earnings to recover your purchase price. Returns a verdict (Deeply Discounted / Fairly Priced / Stretched / Fully Priced / Priced for Perfection) based on payback period thresholds. Can run standalone (with FMP_API_KEY) or paired with the FMP MCP Server for richer data access.",
});

// ── calculate_tup tool (always available — no API key needed) ───────────────
server.tool(
  "calculate_tup",
  `Calculate Time Until Payback (TUP) from pre-fetched financial data. This is a pure calculation tool — it does NOT fetch data from any API. Provide the financial inputs directly.

This tool is ideal when paired with the FMP MCP Server (financial-modeling-prep-mcp-server), which provides 250+ tools for fetching financial data. Fetch the data you need via FMP MCP tools, then pass it here for TUP analysis.

Required data can be obtained from these FMP MCP tools:
  - get_company_profile → marketCap, sector, industry
  - get_full_quote → currentPrice, ttmEPS (eps field), sharesOutstanding, priceAvg200, dividendYield
  - get_balance_sheet → totalDebt, cashAndShortTermInvestments
  - get_income_statement → for computing historical EPS growth, operatingMargin, revenuePerShare
  - get_analyst_estimates → forwardEPS (epsAvg field), forward growth rates

Returns a verdict: Deeply Discounted / Fairly Priced / Stretched / Fully Priced / Priced for Perfection, plus a year-by-year payback schedule.`,
  {
    ticker: z.string().describe("Stock ticker symbol for labeling the output (e.g., AAPL)"),
    companyName: z.string().optional().describe("Company name for labeling (e.g., Apple Inc.)"),
    marketCap: z.number().describe("Market capitalization in dollars"),
    debt: z.number().describe("Total debt in dollars (from balance sheet totalDebt)"),
    cash: z.number().describe("Cash and short-term investments in dollars"),
    shares: z.number().describe("Shares outstanding"),
    ttmEPS: z.number().describe("Trailing twelve month earnings per share"),
    forwardEPS: z.number().describe("Forward EPS consensus estimate (analyst epsAvg)"),
    historicalGrowth: z.number().describe("Historical EPS growth rate as percentage (e.g., 15 for 15%)"),
    fwdGrowthY1: z.number().describe("Forward EPS growth rate Year 1 as percentage"),
    fwdGrowthY2: z.number().optional().describe("Forward EPS growth rate Year 2 as percentage (if available)"),
    currentPrice: z.number().describe("Current stock price"),
    sma200: z.number().optional().default(0).describe("200-day simple moving average price (for falling knife detection)"),
    dividendYield: z.number().optional().default(0).describe("Dividend yield as percentage (e.g., 2.5 for 2.5%)"),
    operatingMargin: z.number().optional().describe("Operating margin as percentage (e.g., 30 for 30%) — affects growth decay rate"),
    sector: z.string().optional().default("Unknown").describe("Company sector"),
    industry: z.string().optional().default("Unknown").describe("Company industry"),
    exchange: z.string().optional().default("").describe("Exchange (e.g., NASDAQ, NYSE)"),
  },
  async (params) => {
    try {
      // Derive fields the TUP engine needs
      const analystGrowth = params.fwdGrowthY1;
      const revenuePerShare = 0; // only needed for pre-profit mode
      const targetMargin = 15;
      const inceptionGrowth = params.historicalGrowth;
      const breakEvenYear = params.ttmEPS <= 0 ? 3 : 1;

      // Classify lifecycle stage from growth + margin
      let lifecycleStage = null;
      if (params.operatingMargin != null) {
        if (params.operatingMargin < 0) lifecycleStage = "startup";
        else if (params.historicalGrowth > 30) lifecycleStage = "high_growth";
        else if (params.historicalGrowth > 15) lifecycleStage = "young_growth";
        else if (params.historicalGrowth > 5) lifecycleStage = "mature_growth";
        else if (params.historicalGrowth >= 0) lifecycleStage = "mature_stable";
        else lifecycleStage = "decline";
      }

      const inp = {
        marketCap: params.marketCap,
        debt: params.debt,
        cash: params.cash,
        shares: params.shares,
        ttmEPS: params.ttmEPS,
        forwardEPS: params.forwardEPS,
        historicalGrowth: params.historicalGrowth,
        analystGrowth,
        fwdGrowthY1: params.fwdGrowthY1,
        fwdGrowthY2: params.fwdGrowthY2 ?? null,
        revenuePerShare,
        targetMargin,
        inceptionGrowth,
        breakEvenYear,
        currentPrice: params.currentPrice,
        sma200: params.sma200 ?? 0,
        dividendYield: params.dividendYield ?? 0,
        operatingMargin: params.operatingMargin ?? null,
        lifecycleStage,
        decayMode: "vdr",
        growthOverrides: {},
        fwdCAGR: null,
      };

      const result = calcTUP(inp);

      if (!result) {
        return {
          content: [{
            type: "text",
            text: `Unable to calculate TUP for "${params.ticker}" — insufficient financial data (shares must be > 0).`,
          }],
        };
      }

      const data = {
        companyName: params.companyName || params.ticker,
        ticker: params.ticker,
        sector: params.sector || "Unknown",
        industry: params.industry || "Unknown",
        exchange: params.exchange || "",
        marketCap: params.marketCap,
        debt: params.debt,
        cash: params.cash,
        ttmEPS: params.ttmEPS,
        forwardEPS: params.forwardEPS,
        historicalGrowth: params.historicalGrowth,
        fwdGrowthY1: params.fwdGrowthY1,
        fwdGrowthY2: params.fwdGrowthY2 ?? null,
        currentPrice: params.currentPrice,
        sma200: params.sma200 ?? 0,
        dividendYield: params.dividendYield ?? 0,
        operatingMargin: params.operatingMargin ?? null,
        lifecycleStage,
      };

      return {
        content: [{
          type: "text",
          text: formatTUPResult(data, result),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `Error calculating TUP for "${params.ticker}": ${err.message}`,
        }],
        isError: true,
      };
    }
  }
);

// ── analyze_stock tool (requires FMP_API_KEY) ───────────────────────────────
if (HAS_API_KEY) {
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

Also detects "falling knife" situations where the stock price is below its 200-day simple moving average.

NOTE: If you also have the FMP MCP Server installed, prefer using its data tools + the calculate_tup tool instead — you'll get richer data and avoid duplicate API calls.`,
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

        return {
          content: [{
            type: "text",
            text: formatTUPResult(data, result),
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

  // ── search_tickers tool (requires FMP_API_KEY) ──────────────────────────────
  server.tool(
    "search_tickers",
    `Search for stock ticker symbols by company name or partial symbol. Returns up to 10 matching results with symbol, company name, exchange, and currency. Use this to find the correct ticker symbol before running analyze_stock.

NOTE: If you also have the FMP MCP Server installed, you can use its search tools instead.`,
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
}

// ── Start server ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
