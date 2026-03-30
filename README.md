# TUP Calculator

**Live at [tupcalculator.org](https://tupcalculator.org)**

Automating my favorite way of evaluating growth stocks: calculating the time until payback. My hope is that this tool makes it easy for anyone to understand whether a stock is a good investment or not by making sense of the numbers. No more throwing darts at a chart; find confidence and understanding in what you own.

---

## System Architecture

TUP Calculator is a single-page React 19 application built with TypeScript and Vite. The static frontend is served from an EC2 instance via Nginx, which also reverse-proxies API requests to an Express server that handles FMP communication and server-side computations. All TUP payback calculations happen client-side in the browser.

```
+-------------------------------------------------------------+
|  Browser                                                    |
|                                                             |
|  React 19 SPA (tupcalculator.org)                           |
|  +-------------+  +----------------+  +------------------+  |
|  | HeroSearch  |->| lookupTicker   |->| calcTUP(inp,mode)|  |
|  | DiceRoll    |  | (api.ts)       |  | (calcTUP.ts)     |  |
|  +-------------+  +-------+--------+  +--------+---------+  |
|                           |                    |            |
|                 9 parallel        +------+-----------+      |
|                 /api/fmp/* reqs   | VerdictCard      |      |
|                           |       | ValuationContext |      |
|                           |       | CompanyScorecard |      |
|                           |       | Table            |      |
|                           |       +------------------+      |
|                           |                                 |
+---------------------------|---------------------------------+
                            |       
                            v       
+-------------------------------------------------------------+
|  EC2 Instance (Ubuntu)                                      |
|                                                             |
|  Nginx                                                      |
|  ├─ Serves static dist/ files (HTML, JS, CSS)               |
|  └─ Reverse-proxies /api/* → Express :3001                  |
|                                                             |
|  Express Proxy (:3001)                                      |
|  ├─ /fmp/:endpoint  — FMP API proxy (hides key, caches)     |
|  ├─ /search          — Ticker search with dedup             |
|  └─ /industry-growth — Peer blended growth median (server)  |
|                           |                                 |
+---------------------------|─────────────────────────────────+
                            |
                            v
                 Financial Modeling Prep API
                 (financialmodelingprep.com/stable)
```

**What runs where:**
- **Browser** — All TUP payback calculations (`calcTUP`), lifecycle classification, VDR fade, UI rendering
- **EC2 (Express)** — FMP API proxying (key hiding + response caching), ticker search dedup, industry peer growth computation
- **FMP** — Raw financial data (prices, EPS, balance sheets, analyst estimates)

### Source Layout

```
src/
├── App.tsx                  # Root component — all state, layout, orchestration
├── App.css                  # Keyframe animations + responsive media query overrides
├── index.css                # Global resets (box-sizing, body, focus-visible, sr-only)
├── hooks/
│   ├── useTickerFetch.ts     # Ticker lookup orchestration hook (extracted from App)
│   └── useTickerFetch.types.ts
├── lib/
│   ├── api.ts               # FMP data fetching (9 parallel requests) + derived fields
│   ├── calcTUP.ts           # Core TUP payback algorithm
│   ├── lifecycle.ts         # Damodaran-inspired lifecycle stage classifier
│   ├── vdr.ts               # Variable Decay Rate engine
│   ├── constants.ts         # Thresholds, ADR table, FX fallbacks, verdict metadata
│   ├── types.ts             # All shared TypeScript interfaces
│   ├── theme.ts             # Color palette and design tokens
│   ├── utils.ts             # Number formatting helpers
│   └── devData.ts           # Hardcoded AAPL data for local dev (no API key needed)
├── components/              # Folder-per-component structure
│   ├── CompactTickerBar/     # Condensed ticker display after lookup
│   ├── CompanyScorecard/     # Earnings surprises + cash flow history
│   ├── DataSections/         # Financial data display sections
│   │   ├── EnterpriseValue/
│   │   ├── GrowthAssumptions/
│   │   ├── TechnicalValidation/
│   │   └── YearByYearBreakdown/
│   ├── DiceFilterBar/        # Random stock filter controls + SectorDropdown
│   ├── HeroSearch/           # Ticker search input (hero section)
│   ├── Masthead/             # App header and branding
│   ├── MethodologyPage/      # Full methodology explanation
│   │   ├── CalloutBlock.tsx
│   │   ├── FormulaBlock.tsx
│   │   ├── SectionNum.tsx
│   │   └── SubHead.tsx
│   ├── Table/                # Year-by-year EPS compounding breakdown
│   ├── TickerSearch/         # Typeahead ticker search + SearchDropdown
│   ├── ValuationContext/     # Lynch PEG, DCF delta, Altman Z, Piotroski F
│   ├── VerdictCard/          # Payback result + verdict badge
│   └── primitives/           # Shared UI primitives (Field, DataRow, SectionLabel, ErrorDisplay)

server/
├── index.js                  # Express entry point (EC2, port 3001)
├── routes.js                 # Route handlers (/fmp, /search, /industry-growth)
├── middleware.js             # Express middleware (CORS, logging, error handling)
├── lib/
│   ├── cache.js              # Response caching layer
│   └── fmp.js                # FMP API client (key injection, request helpers)
├── nginx.conf                # Production Nginx config
└── nginx-dev.conf            # Dev Nginx config
```

Each component folder contains `ComponentName.tsx`, `ComponentName.types.ts`, and an `index.ts` barrel export. Some components include additional helpers (e.g., `*.helpers.ts`) or sub-components.

### Data Pipeline

When a ticker is entered, `lookupTicker()` fires 9 parallel requests through the proxy:

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `profile` | Company name, sector, market cap |
| 2 | `quote` | Live price, TTM EPS, shares, 200-SMA, dividend yield |
| 3 | `balance-sheet-statement` | Debt, cash (2 years) |
| 4 | `income-statement` | Revenue, net income (10 years) |
| 5 | `financial-growth` | Historical EPS growth (10 years) |
| 6 | `analyst-estimates` | Forward EPS & revenue estimates |
| 7 | `key-metrics-ttm` | PEG ratio, dividend yield fallback |
| 8 | `dividends` | Forward dividend yield (4-tier waterfall) |
| 9 | `discounted-cash-flow` | DCF intrinsic value |

FX normalisation runs automatically for non-USD listed stocks. ADR ratio adjustments are applied for dual-listed securities (NVO, ASML, TSM, etc.).

The fetched data populates `InputState`, which feeds into `calcTUP(inp, mode)`. The result is derived via `useMemo` and recalculates on every input change — no manual "calculate" button needed.

---

## Methodology

### 01. Adjusted Share Price (Enterprise Value Per Share)

Before comparing earnings against the stock price, TUP adjusts for the company's balance sheet. Debt is added because it represents obligations that must be serviced before shareholders see returns, while cash is subtracted because it's already owned by shareholders. The result is the enterprise value per share — the true cost an investor is paying for the business.

```
Adjusted Price = (Market Cap + Total Debt − Cash) / Shares Outstanding
```

- **Market Cap** — Current share price × total shares outstanding
- **Total Debt** — All short-term and long-term borrowings on the balance sheet
- **Cash** — Cash and cash equivalents (liquid assets immediately available)
- **Shares** — Diluted shares outstanding

**Why not just use the stock price?** Two companies trading at $100/share may have very different enterprise values. A company with $50B in debt is far more expensive to "own" than one with $50B in cash — even if their market caps are identical. The adjusted price captures this difference.

---

### 02. Historical EPS Growth (Endpoint CAGR with Anchor Shifting)

Derived from diluted EPS on the income statement (net income ÷ shares). TUP uses a three-tier cascade to compute both 5-year and 10-year historical growth rates, handling extreme values at each level.

**Tier 1 — Endpoint CAGR:**

```
CAGR = [(EPS_end / EPS_start)^(1/n) − 1] × 100
```

Uses only the start and end EPS values — naturally smooths over mid-period spikes and collapses because intermediate years don't affect the result. Only valid when both endpoints are positive and the resulting rate is ≤ ±100%.

**Tier 2 — Anchor Shifting:**

When the full-window CAGR exceeds ±100% (typically because the start-year EPS is near-zero after a bad year) or is undefined (negative start EPS), TUP walks the start year inward toward the present, looking for the nearest positive-EPS anchor that yields a CAGR ≤ ±100%. A minimum of 2 compounding periods is required.

**Tier 3 — Winsorized Median (Final Fallback):**

When no positive anchor produces a reasonable CAGR — common for turnaround companies with mostly negative historical EPS — TUP falls back to the median of year-over-year EPS growth rates, with each rate winsorized (clamped) to ±100%. Extreme years still contribute directional drag without dominating the result.

```
YoY_i = clamp((EPS_i − EPS_i-1) / |EPS_i-1|, −1, +1)
Fallback = median(YoY_1, …, YoY_n) × 100
```

- **EPS_end** — Most recent fiscal year diluted EPS
- **EPS_start** — Farthest available year, or nearest positive-EPS anchor after shifting
- **n** — Number of years between the chosen anchor and the most recent year

**Why anchor shifting?** A company like APP with EPS going from $0.10 (near-zero after a bad year) to $6.67 in 5 years produces a raw CAGR of 131% — massively inflated by the low-base anchor. Shifting to the nearest reasonable anchor ($0.45, 4 years back) yields 96% — still high, but grounded in a meaningful starting point. For turnaround companies like HIMS where most historical EPS is negative, the winsorized median captures directional momentum without the distortion.

**±100% CAGR threshold:** A 100% CAGR means EPS doubled every year for the entire window — almost always an artifact of a near-zero starting EPS rather than sustainable growth. The Variable Decay Rate (Step 05) further ensures that even high but legitimate growth rates are reduced aggressively over time, so the threshold and the fade model work together to prevent compounding runaway.

---

### 03. Analyst Forward Growth (Consensus Estimate)

The consensus view of professional researchers covering the stock — typically the estimated EPS growth for the next fiscal year or a 2-year annualized projection. This is blended with the historical CAGR to produce the final growth rate used in the payback calculation.

**Primary (Estimate-to-Estimate):**

```
Analyst Growth = (EPS_T+1 − EPS_T) / EPS_T
```

Where EPS_T is the current fiscal year estimate and EPS_T+1 is the next fiscal year estimate. Both come from the same analyst data source, ensuring a consistent accounting basis.

**Revenue Fallback:** If analyst EPS estimates are unavailable, TUP falls back to analyst revenue estimates using the same CAGR formula. If no estimates are available at all, the analyst growth defaults to 80% of the historical CAGR.

#### Forward Growth Components: Y1, Y2, and Terminal Rate

When analyst estimates are available for multiple years, TUP derives three distinct forward growth rates that feed into the year-by-year payback table. This produces a more realistic trajectory than applying a single flat rate — growth typically decelerates as a company scales.

**Y1 Growth** — `(EPS_T+1 / EPS_T) − 1`:
Growth from the current fiscal year estimate to the next fiscal year estimate. Both values come from analyst consensus (same accounting basis), avoiding GAAP vs adjusted EPS mismatches that would inflate the rate.

**Y2 Growth** — `(EPS_T+2 / EPS_T+1) − 1`:
Growth from the next fiscal year to the year after. This often differs meaningfully from Y1 — a company accelerating out of a down cycle may show Y2 > Y1, while a maturing company typically shows Y2 < Y1.

**Terminal Forward CAGR** — `(EPS_T+2 / EPS_T)^(1/3) − 1`:
The annualized growth rate across all available estimate years. This smooths Y1 and Y2 into a single rate used for Year 3 onward, blended with historical growth, until the lifecycle fade model takes over.

**Bear / Base / Bull Scenarios:** Analyst estimates include low, average, and high EPS projections. TUP precomputes all three scenarios at fetch time — the bear case uses `epsLow`, base uses `epsAvg`, and bull uses `epsHigh`. Toggling between them swaps the Y1, Y2, and CAGR values, which flows through the entire payback calculation automatically.

**Why blend historical + analyst?** Historical growth shows what the company has actually achieved; analyst estimates show what the market expects going forward. Averaging the two tempers over-optimistic projections while still capturing forward momentum — especially useful for companies entering a new growth phase.

---

### 04. Dividend Yield (Total Return Component)

For income-generating companies, the dividend yield represents a guaranteed annual return to shareholders independent of share price appreciation. TUP adds it to the compounding rate because it effectively accelerates EPS recovery from the investor's perspective.

```
Dividend Yield = Annual Dividends Per Share / Current Price × 100
```

**Why add it post-blend?** Averaging the yield in with the two growth rates would dilute the signal from historical and analyst EPS estimates. Adding it afterward preserves the integrity of the growth analysis while correctly boosting the total compounding rate. A company that grows EPS at 17% and pays a 5% dividend is genuinely compounding at 22% for a holder who reinvests dividends.

---

### 05. TUP Combined Growth Rate (Blended Assumption)

Average the two inputs to produce a blended growth rate. If the company pays a dividend, its yield is added on top — because shareholders receive that return regardless of EPS growth.

```
Blended Growth = (Historical CAGR + Analyst Forward) / 2
Total Compounding Rate = Blended Growth + Dividend Yield
```

**Example — Dividend-Paying Company (e.g. NVO):**
- Historical CAGR (10 yr): 20%
- Analyst Forward Estimate: 15%
- Blended Growth: 17.5%
- Dividend Yield: 4.9%
- **Total Compounding Rate: 22.4%**

The 22.4% Total Compounding Rate is applied year-over-year to project EPS until the cumulative sum equals the Adjusted Price. The dividend yield is added after the average — not inside it — so it doesn't distort the EPS growth signal.

#### Lifecycle Fade with Variable Decay Rate

Rather than applying a flat growth cap, TUP uses a Lifecycle Fade model with a Variable Decay Rate (VDR) that scales with the initial growth rate. Hyper-growth companies face more aggressive annual reduction, while moderate growers decay gracefully — eliminating the need for a hard cap.

The company is classified into one of six lifecycle stages using a multi-factor approach inspired by Damodaran's corporate lifecycle framework. Rather than relying on revenue growth alone, classification considers revenue growth (3-year CAGR), profitability, operating margin level, and capital return policy (dividend yield as a maturity signal).

Earlier-stage companies get longer hold periods because their high growth rates are expected to persist — a start-up reinvesting heavily has years of runway ahead, while a mature company's growth is already near its ceiling.

| Stage | Criteria | Hold Period |
|-------|----------|-------------|
| Start-Up | Unprofitable, low/moderate revenue growth, no maturity signals | 7 years |
| Young Growth | Revenue growth > 20% (unprofitable) or > 25% with thin margins | 5 years |
| High Growth | Profitable, revenue growth > 15% | 3 years |
| Mature Growth | Profitable, revenue growth 5–15% | 5 years |
| Mature Stable | Profitable, revenue growth 0–5%, or mature company in downturn | 3 years |
| Decline | Revenue declining (< −5%), or mildly declining without maturity signals | 3 years |

During the **Hold Period**, the initial blended growth rate is maintained at full strength. After the hold period expires, the rate decays annually using a Variable Decay Rate that scales with the initial growth and is adjusted by multi-factor modifiers:

**Base Variable Decay Rate:**

```
VDR_base = max( 2%, G_initial × VDR_Factor )
```

**VDR Factor (tiered):**

```
G ≥ 40% → 20%  |  20–40% → 15%  |  <20% → 10%
```

**Multi-Factor Adjusted VDR:**

```
VDR = VDR_base × Margin_Mod × Profitability_Mod
```

**Lifecycle Fade Formula:**

```
G(n) = max( G_initial − (n − HoldPeriod) × VDR, Dynamic_Floor )
```

#### Multi-Factor Modifiers

The base VDR is adjusted by additional signals that capture the quality and sustainability of growth:

| Modifier | Condition | Effect |
|----------|-----------|--------|
| Margin | Op. Margin ≥ 20% | 0.8× (slower decay) |
| Margin | Op. Margin 10–20% | 1.0× (neutral) |
| Margin | Op. Margin 5–10% | 1.1× (faster decay) |
| Margin | Op. Margin < 5% | 1.2× (faster decay) |
| Profit | TTM EPS ≤ 0 | 1.25× (speculative) |
| Profit | TTM EPS > 0 | 1.0× (neutral) |
| Floor | Div Yield > 0 | 5% + ½ yield (cap 8%) |
| Floor | Div Yield = 0 | 5% base floor |

**Why these modifiers?** The lifecycle stage and initial growth magnitude capture the broad trajectory, but they miss qualitative differences between companies at the same stage. A "Mature Growth" company with 30% operating margins (wide moat) should decay slower than one with 4% margins (commodity business). Similarly, unprofitable companies with speculative growth estimates should fade faster, and dividend payers deserve a higher growth floor because their total shareholder return includes cash distributions that persist even as EPS growth slows.

**Example A — Pre-Profit Start-Up** (70% initial, Start-Up, 3% margin, EPS < 0):
- Base VDR: max(2%, 70% × 20%) = 14%
- Margin modifier: 3% margin → 1.2×
- Profitability modifier: EPS ≤ 0 → 1.25×
- Adjusted VDR: 14% × 1.2 × 1.25 = 21%
- Floor: 5% (no dividend)
- Years 1–7 (hold): 70% → Year 8: 49% → Year 9: 28% → Year 10: 7% → **Year 11+: 5% floor**

**Example B — Young Growth Company** (35% initial, Young Growth, 25% margin):
- Base VDR: max(2%, 35% × 15%) = 5.25%
- Margin modifier: 25% margin → 0.8×
- Adjusted VDR: 5.25% × 0.8 = 4.2%
- Floor: 5% (no dividend)
- Years 1–5 (hold): 35% → Year 6: 30.8% → Year 8: 22.4% → Year 12: 5.6% → **Year 13+: 5% floor**

**Example C — Mature Dividend Blue-Chip** (12% initial, Mature Growth, 30% margin, 3% yield):
- Base VDR: max(2%, 12% × 10%) = 2%
- Margin modifier: 30% margin → 0.8×
- Adjusted VDR: max(2%, 2% × 0.8) = 2%
- Dynamic Floor: 5% + ½(3%) = 6.5%
- Years 1–5 (hold): 12% → Year 6: 10% → Year 7: 8% → **Year 8+: 6.5% floor (dividend-lifted)**

#### Key Guardrails

1. **Dividend Yield Adder** — The yield is added post-blend, not averaged in. A 4.9% yield on a 17.5% grower produces 22.4% total compounding, not a misleadingly inflated 18% average.

2. **Dynamic Floor** — The VDR decay floor starts at 5% (GDP + inflation) and rises by half the dividend yield, capped at 8%. A 3% dividend payer floors at 6.5%, reflecting that even as EPS growth stalls, the total return to shareholders includes persistent cash distributions.

3. **Margin & Profitability Modifiers** — All modifiers default to neutral (1.0×) when data is unavailable. This ensures the VDR gracefully degrades to the base single-factor model rather than producing distorted results for companies with missing data.

4. **Consistency Check** — If historical growth is 50% but analysts expect 5%, the business model may be broken or the industry is maturing rapidly. In these cases, lean more heavily on the lower number.

---

### 06. Verdict

TUP answers one question: *at this price, how long before the company earns back what you paid?* The payback period determines the verdict:

| Verdict | Condition |
|---------|-----------|
| **Strong Buy** | ≤ 7 years |
| **Buy** | ≤ 10 years |
| **Hold** | ≤ 15 years |
| **Avoid** | > 15 years or falling knife |
| **Patient Buy** | Buy-zone but below 200-day SMA |

**Falling knife logic:** If the stock price is below the 200-day simple moving average while otherwise in buy territory, the verdict is downgraded to "Patient Buy" — a signal to wait for price to recover above the long-term trend before entering a position.

Additional context is shown alongside the verdict: Peter Lynch PEG score, DCF delta, Altman Z-Score, Piotroski F-Score, earnings surprise history, and cash flow trends.

---

### 07. Roll the TUP Dice (Random Stock Discovery)

The Roll Dice feature selects a random publicly traded stock, fetches its financial data, and runs the TUP calculation automatically. It draws from the full universe of VTI-held equities — roughly 3,000+ US-listed stocks — filtering out ETFs, funds, and non-equity instruments.

Each roll attempts up to 20 candidates, validating that the stock produces a meaningful TUP payback between 5 and 20 years. Stocks outside this range are skipped to prevent the dice from landing on companies with broken data, negative earnings, or unrealistically short/long payback periods.

**Filter Settings:** Click the settings icon next to the Roll Dice button to reveal the filter bar. Filters narrow the random pool so you can target specific types of companies:

- **Market Cap** — Micro (<$300M), Small ($300M–$2B), Mid ($2B–$10B), or Large (>$10B)
- **Exchange** — NYSE (includes AMEX), NASDAQ, OTC, LSE (London), or TSX (Toronto)
- **Sector** — Filter by GICS sector (Technology, Healthcare, Financial Services, etc.)
- **ETF** — Replace the default VTI universe with any ETF's holdings (e.g. SPY, QQQ, ARKK)

---

## Running Locally

**Prerequisites:** Node.js 20+, an FMP API key ([free tier](https://financialmodelingprep.com/developer/docs/))

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start the proxy (terminal 1)
FMP_API_KEY=your_key_here node server/index.js

# Start the dev server (terminal 2)
npm run dev
```

The Vite dev server proxies `/api/*` to `localhost:3001` automatically.

---

## Disclaimer

For educational purposes only. Not financial advice. Data provided by [Financial Modeling Prep](https://financialmodelingprep.com).
