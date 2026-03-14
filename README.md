# TUP Calculator

**Time Until Payback** — a stock valuation engine that computes how many years of compounded EPS growth it takes to recover the enterprise value paid per share.

Live at [tupcalculator.org](https://tupcalculator.org)

---

## What It Does

TUP answers one question: *at this price, how long before the company earns back what you paid?*

Enter a ticker. The app fetches live financials from Financial Modeling Prep, runs the TUP algorithm, and returns a payback period in years alongside a verdict:

| Verdict | Condition |
|---------|-----------|
| **Strong Buy** | ≤ 7 years |
| **Buy** | ≤ 10 years |
| **Hold** | ≤ 15 years |
| **Avoid** | > 15 years or falling knife |
| **Patient Buy** | Buy-zone but below 200-day SMA |

Two modes:
- **Standard** — for profitable companies: blends TTM + forward EPS, averages historical + analyst growth
- **Pre-Profit** — for high-growth pre-revenue companies: derives implied EPS from `revenue/share × target margin`, starts accumulating from a configurable breakeven year (threshold: ≤ 8 years)

Additional context shown alongside the verdict: Peter Lynch PEG score, DCF delta, Altman Z-Score, Piotroski F-Score, earnings surprise history, and cash flow trends.

---

## Core Algorithm: `calcTUP(inp, mode)`

Defined in `src/lib/calcTUP.ts`.

Simulates year-by-year EPS compounding until the cumulative sum equals the adjusted share price (enterprise value per share):

```
Adj. Price = (Market Cap + Debt − Cash) / Shares Outstanding
```

Growth is blended:
```
Standard:   rate = avg(historicalEPSGrowth, analystForwardGrowth) + dividendYield
Pre-Profit: rate = avg(inceptionRevenueCAGR, analystForwardGrowth) + dividendYield
```

Accumulation runs until `sum(EPS × (1 + rate)^year) ≥ adjPrice`, capped at 30 years.

**Falling knife logic:** if `currentPrice < 200-day SMA`, a buy-zone result is downgraded to `Patient Buy` (wait for price to recover above trend).

---

## Data: `lookupTicker(ticker, log)`

Defined in `src/lib/api.ts`. Fires 11 parallel requests through the proxy:

| # | Endpoint | Used For |
|---|----------|----------|
| 1 | `profile` | Company name, sector, market cap |
| 2 | `quote` | Live price, TTM EPS, shares, 200-SMA, dividend yield |
| 3 | `balance-sheet-statement` | Debt, cash (2 years) |
| 4 | `income-statement` | Revenue, net income (10 years) |
| 5 | `financial-growth` | Historical EPS growth (10 years) |
| 6 | `analyst-estimates` | Forward EPS & revenue estimates |
| 7 | `key-metrics-ttm` | PEG ratio, dividend yield fallback |
| 8 | `dividends` | Forward dividend yield (4-tier waterfall) |
| 9 | `discounted-cash-flow` | DCF intrinsic value |
| 10 | `earnings-surprises` | Analyst beat/miss history |
| 11 | `cash-flow-statement` | Operating/investing/financing flows |

FX normalisation runs automatically for non-USD listed stocks (ADR ratio table included for NVO, ASML, TSM).

---

## Project Structure

```
tup-calculator/
├── server/
│   ├── index.js          # Express proxy server (runs on EC2, port 3001)
│   └── package.json
├── src/
│   ├── App.tsx           # Main app — all state, layout, UI orchestration
│   ├── lib/
│   │   ├── api.ts        # FMP data fetching + all derived field calculations
│   │   ├── calcTUP.ts    # Core TUP payback algorithm
│   │   ├── constants.ts  # Thresholds, ADR table, FX fallbacks, verdict metadata
│   │   ├── types.ts      # All shared TypeScript interfaces
│   │   └── utils.ts      # Number formatting helpers
│   └── components/
│       ├── VerdictCard.tsx       # Payback result + verdict badge
│       ├── ValuationContext.tsx  # Lynch PEG, DCF delta, Altman Z, Piotroski F
│       ├── CompanyScorecard.tsx  # Earnings surprises + cash flow history
│       ├── MethodologyPage.tsx   # Full-screen methodology explanation
│       ├── Table.tsx             # Year-by-year EPS compounding breakdown
│       └── ui.tsx                # Shared primitives (Field, DataRow, SectionLabel)
├── deploy.sh             # Build + deploy to EC2 (frontend + proxy)
├── vite.config.ts        # Vite config; dev proxy: /api → localhost:3001
└── index.html
```

---

## Running Locally

**Prerequisites:** Node.js 20+, an FMP API key ([free tier](https://financialmodelingprep.com/developer/docs/))

```bash
# 1. Install frontend dependencies
npm install

# 2. Install proxy dependencies
cd server && npm install && cd ..

# 3. Start the proxy (in one terminal)
FMP_API_KEY=your_key_here node server/index.js

# 4. Start the dev server (in another terminal)
npm run dev
```

The Vite dev server proxies `/api/*` to `localhost:3001` automatically.

**Available scripts:**

```bash
npm run dev       # Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
```

---

## Design

- Fonts: DM Serif Display, Barlow Condensed, JetBrains Mono, Space Grotesk
- Palette: `#080808` background · `#C4A06E` tan accent · `#FF4D00` vermillion · `#00BFA5` teal · `#10d97e` green
- All styles are inline style objects. `rsp-*` class names exist solely as selectors for the `<style>` block's responsive media queries.
- No Tailwind, no CSS modules.

---

## Disclaimer

For educational purposes only. Not financial advice. Data provided by [Financial Modeling Prep](https://financialmodelingprep.com).
