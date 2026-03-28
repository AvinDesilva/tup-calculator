# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint on all .ts/.tsx files
npm run typecheck # Run tsc --noEmit (TypeScript type checking)
npm run test      # Run vitest unit tests (single run)
npm run test:watch # Run vitest in watch mode
```

## Git Workflow

- **Always create a feature branch before making substantive code changes**
- Branch naming: `feature/`, `fix/`, `refactor/`, etc. for clarity

### Deploy to dev for testing

After committing changes on a feature branch, **always deploy to the dev server first**:

```bash
git push origin feature/my-branch:dev -f
```

This triggers `.github/workflows/deploy-dev.yml` and deploys to `https://dev.tupcalculator.org`. Wait for the user to verify changes on the dev server before proceeding.

### Deploy to production

Only after the user approves changes on dev:

```bash
git checkout main
git merge feature/my-branch
git push origin main
```

This triggers `.github/workflows/deploy.yml` and deploys to `https://tupcalculator.org`.

- **Never merge directly to `main` without deploying to dev first**
- The `dev` branch is a deployment target only — force-push is expected

## CI/CD

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. **CI job:** `npm ci` → lint → typecheck → test → build
2. **Deploy job:** Temporarily opens SSH for the runner IP, rsyncs `dist/` + `server/` to the EC2 instance, restarts tup-proxy, reloads nginx, runs a health check, then revokes SSH access.

GitHub Secrets required: `EC2_SSH_PRIVATE_KEY`, `EC2_HOST`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

The legacy manual deploy script is at `deploy.sh.legacy` (emergency fallback only).

## Infrastructure (Terraform)

All AWS infrastructure is managed in `terraform/` (S3 remote state):
- EC2 instance, security group, key pair
- CloudWatch alarms (status check, CPU, network, billing) + SNS topic
- IAM user + scoped policy

```bash
cd terraform
terraform init    # First time only
terraform plan    # Preview changes
terraform apply   # Apply changes (review plan first!)
```

State backend: S3 bucket `tup-calculator-tfstate` with DynamoDB lock table `tup-calculator-tflock`.

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

Verdict logic: `fallingKnife` (price < 200-day SMA) forces `"avoid"`. Otherwise payback vs threshold determines `strong_buy / buy / hold / avoid`. Growth is capped implicitly at 30 years (SAFETY_CAP).

### FMP API Service: `lookupTicker(ticker, apiKey, log)`

Fires 6 parallel requests to Financial Modeling Prep v3:
1. `/profile` — market cap, sector, industry
2. `/quote` — price, TTM EPS, shares outstanding, 200-SMA
3. `/balance-sheet-statement?limit=1` — debt, cash
4. `/income-statement?limit=4` — revenue, net income (4 years)
5. `/financial-growth?limit=5` — historical EPS growth (5 years)
6. `/analyst-estimates?limit=1` — forward EPS & revenue estimates 

The function derives all `inp` state fields from these responses and returns them for `setInp(...)`.

### UI Structure

The main `App` component manages all state. Key state:
- `inp` — all numeric calculator inputs (marketCap, debt, cash, shares, ttmEPS, forwardEPS, historicalGrowth, analystGrowth, revenuePerShare, targetMargin, inceptionGrowth, breakEvenYear, currentPrice, sma200)
- `manual` — toggles between API-fetched read-only display and editable `<Field>` inputs
- `noiseFilter` — strips the verdict card down to just the payback number
- `showMethodology` — swaps in the `<MethodologyPage>` full-screen view

`result` is derived via `useMemo(() => calcTUP(inp, mode), [inp, mode])` — recalculates on every input change.

### Styling

All styles are **inline style objects** — no CSS classes except for responsive breakpoints. The `rsp-*` class names in JSX exist solely as selectors for the `<style>` block's media queries at the bottom of `App`. Tailwind is listed as a devDependency but is not used.

Fonts loaded from Google Fonts at runtime: `Barlow Condensed`, `Space Grotesk`, `JetBrains Mono`.

### ESLint

`no-unused-vars` is configured to ignore variables matching `^[A-Z_]` (uppercase/underscore prefix), accommodating React component names and constants.

## Accessibility

All UI work must meet WCAG 2.1 AA. Full accessibility guidelines (semantic HTML, keyboard navigation, ARIA patterns, color contrast, forms, audit checklist) are in the `accessibility-tools` skill.
