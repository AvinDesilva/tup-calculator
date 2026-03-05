# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint on all .ts/.tsx files
npm run typecheck # Run tsc --noEmit (TypeScript type checking)
```

No test runner is configured.

## Environment

The FMP API key can be pre-loaded via an env variable:

```
VITE_FMP_API_KEY=your_key_here
```

Without it, users paste their key directly into the UI.

## Architecture

This is a single-page React 19 app (Vite + TypeScript + JSX). Source files use `.ts`/`.tsx` extensions. The main app entry is `src/App.tsx`; shared domain types live in `src/lib/types.ts`.

### Core Calculation: `calcTUP(inp, mode)`

The TUP ("Time Until Payback") algorithm computes how many years of compounded EPS growth it takes to recover the adjusted share price (enterprise value per share). Two modes:

- **`standard`** — for profitable companies: blends TTM EPS + forward EPS as the base, averages historical EPS growth + analyst growth as the rate. Buy threshold: ≤ 10 years.
- **`preprofit`** — for pre-profit companies: derives implied EPS from `revenuePerShare × targetMargin`, starts accumulating from `breakEvenYear`. Buy threshold: ≤ 8 years.

Verdict logic: `fallingKnife` (price < 200-day SMA) forces `"avoid"`. Otherwise payback vs threshold determines `strong_buy / buy / hold / avoid`. Growth is capped implicitly at 30 years (SAFETY_CAP).

### FMP API Service: `lookupTicker(ticker, apiKey, log)`

Fires 6 parallel requests to Financial Modeling Prep v3:
1. `/profile` — market cap, sector, industry
2. `/quote` — price, TTM EPS, shares outstanding, 200-SMA
3. `/balance-sheet-statement?limit=1` — debt, cash
4. `/income-statement?limit=4` — revenue, net income (4 years)
5. `/financial-growth?limit=5` — historical EPS growth (5 years)
6. `/analyst-estimates?limit=1` — forward EPS & revenue estimates (gracefully absent on free plan)

The function derives all `inp` state fields from these responses and returns them for `setInp(...)`.

### UI Structure

The main `App` component manages all state. Key state:
- `inp` — all numeric calculator inputs (marketCap, debt, cash, shares, ttmEPS, forwardEPS, historicalGrowth, analystGrowth, revenuePerShare, targetMargin, inceptionGrowth, breakEvenYear, currentPrice, sma200)
- `mode` — `"standard"` | `"preprofit"`
- `manual` — toggles between API-fetched read-only display and editable `<Field>` inputs
- `noiseFilter` — strips the verdict card down to just the payback number
- `showMethodology` — swaps in the `<MethodologyPage>` full-screen view

`result` is derived via `useMemo(() => calcTUP(inp, mode), [inp, mode])` — recalculates on every input change.

### Styling

All styles are **inline style objects** — no CSS classes except for responsive breakpoints. The `rsp-*` class names in JSX exist solely as selectors for the `<style>` block's media queries at the bottom of `App`. Tailwind is listed as a devDependency but is not used.

Fonts loaded from Google Fonts at runtime: `Barlow Condensed`, `Space Grotesk`, `JetBrains Mono`.

### ESLint

`no-unused-vars` is configured to ignore variables matching `^[A-Z_]` (uppercase/underscore prefix), accommodating React component names and constants.
