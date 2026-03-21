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

## Git Workflow

- **Always create a feature branch before making substantive code changes**
- Branch naming: `feature/`, `fix/`, `refactor/`, etc. for clarity
- Test/review changes on the branch before merging to `main`
- Merge to `main` only after verification (testing or user approval)
- Push to GitHub to confirm commits are recorded there
- **Why:** Keeps commit history clean, allows for proper review, and ensures changes are tracked on GitHub

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

## Accessibility (ADA/WCAG 2.1 AA) — Keyboard & Screen Reader Compliance

All UI work must meet WCAG 2.1 AA. The two primary user groups to protect:
1. **Keyboard-only users** — cannot use a mouse; navigate via Tab, Shift+Tab, arrow keys, Enter, Space, Escape
2. **Screen reader users** (NVDA, JAWS, VoiceOver) — rely entirely on semantic HTML and ARIA to understand and operate the UI

---

### Semantic HTML — Use the right element for the job

- Use `<button>` for actions, `<a href>` for navigation. Never attach click handlers to `<div>` or `<span>`.
- Use `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<section>`, `<article>` as landmark regions.
- Every page must have exactly one `<main>` and a visible or sr-only `<h1>`.
- Heading hierarchy must be logical: h1 → h2 → h3. Never skip levels.
- Use `<ul>/<ol>/<li>` for lists, `<table>` with `<caption>/<th scope>` for tabular data.
- Form inputs must use `<label htmlFor>` or `aria-label`. Never rely on placeholder alone.

---

### Keyboard Navigation

- Every interactive element must be reachable and operable via keyboard.
- Tab order must follow visual/logical reading order. Use `tabIndex={0}` to add elements to tab order; never use `tabIndex > 0`.
- Remove elements from tab order with `tabIndex={-1}` only when managed programmatically (e.g., inside a menu or modal).
- Implement these keyboard patterns:
  - **Modals/Dialogs**: Trap focus inside when open. On close, return focus to the trigger element. Close on Escape.
  - **Dropdown menus**: Arrow keys navigate items. Escape closes and returns focus to trigger.
  - **Tabs**: Arrow keys switch tabs. Enter/Space activates. Follow ARIA `tablist/tab/tabpanel` pattern.
  - **Comboboxes/Selects**: Arrow keys navigate options. Enter selects. Escape closes.
  - **Carousels**: Arrow keys or prev/next buttons. Pause button for auto-advancing.
- Custom components must implement the ARIA Authoring Practices Guide (APG) pattern for that widget type.

Focus trap utility example (TypeScript):
```typescript
// useFocusTrap.ts
import { useEffect, useRef } from 'react';

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}
```

---

### Focus Visibility — Tailwind

Every focusable element must have a clearly visible focus ring. Add to your global CSS or Tailwind config:
```css
/* globals.css */
:focus-visible {
  outline: 3px solid #2563EB; /* blue-600 */
  outline-offset: 2px;
  border-radius: 2px;
}
```

In Tailwind, apply `focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none` to every interactive component. Never use `outline-none` or `outline-0` without a replacement focus style.

---

### Screen Reader — ARIA

- Only add ARIA when native HTML semantics are insufficient.
- **Required ARIA patterns:**
  - `aria-label` or `aria-labelledby` on every landmark, icon button, and input without visible text label.
  - `aria-describedby` for fields with helper text or error messages.
  - `aria-expanded` on triggers that open/collapse content (dropdowns, accordions).
  - `aria-haspopup` on triggers that open menus or dialogs.
  - `aria-controls` pointing to the ID of the panel being controlled.
  - `aria-current="page"` on the active nav link.
  - `aria-live="polite"` on regions that update dynamically (toasts, status messages, search results count). Use `aria-live="assertive"` only for urgent errors.
  - `aria-busy="true"` on a container while its content is loading.
  - `role="alert"` for error messages that must be announced immediately.
  - `aria-disabled="true"` (not just `disabled`) when you need the element to remain focusable but inactive.
  - `aria-hidden="true"` on purely decorative SVGs and icons. Pair icon buttons with `aria-label`.

Icon button pattern:
```tsx
<button
  aria-label="Close dialog"
  className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ..."
>
  <XIcon aria-hidden="true" />
</button>
```

Loading state pattern:
```tsx
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Spinner aria-hidden="true" /> : <Results />}
</div>
```

---

### Images & Media

- All `<img>` must have `alt`. Decorative images: `alt=""`.
- Informational SVGs: add `<title>` inside the SVG and `aria-labelledby` pointing to it.
- Charts/graphs: provide a text summary or data table as an alternative via `aria-describedby` or a visually hidden `<caption>`.
- Video: provide captions. Audio: provide transcripts.

---

### Color & Contrast

- Text contrast ratio must be ≥ 4.5:1 (normal text) or ≥ 3:1 (large text, 18pt+ or 14pt bold).
- UI component boundaries (buttons, inputs) must meet ≥ 3:1 against adjacent colors.
- Never convey information by color alone. Add icons, labels, or patterns.
- Check Tailwind color pairings with the WebAIM Contrast Checker before finalizing.

---

### Forms

Every form field must have:
```tsx
<div>
  <label htmlFor="email" className="block text-sm font-medium">
    Email address
  </label>
  <input
    id="email"
    type="email"
    aria-describedby={error ? "email-error" : "email-hint"}
    aria-invalid={!!error}
    className="... focus-visible:ring-2 focus-visible:ring-blue-600"
  />
  <p id="email-hint" className="text-sm text-gray-500">We'll never share your email.</p>
  {error && (
    <p id="email-error" role="alert" className="text-sm text-red-600">{error}</p>
  )}
</div>
```

---

### Skip Navigation

Add a skip link as the very first element in `<body>`:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:ring-2 focus:ring-blue-600 focus:rounded"
>
  Skip to main content
</a>
<main id="main-content" tabIndex={-1}>
  ...
</main>
```

---

### Screen-reader-only Utility (Tailwind)

Use Tailwind's `sr-only` class for text that should be read aloud but not seen:
```tsx
<span className="sr-only">Loading results, please wait</span>
```

---

### Audit Checklist (run before every PR)

- [ ] All interactive elements reachable and operable by keyboard
- [ ] Focus indicator visible on every interactive element
- [ ] Modal/dialog traps focus and returns it on close
- [ ] No `outline-none` without a visible replacement
- [ ] All images have `alt`. Decorative images have `alt=""`
- [ ] All form inputs have associated `<label>`
- [ ] Error messages use `role="alert"` or `aria-live`
- [ ] Dynamic content updates announced via `aria-live`
- [ ] Landmark regions present: `<nav>`, `<main>`, `<header>`, `<footer>`
- [ ] Skip-to-main-content link present
- [ ] Color contrast ≥ 4.5:1 for all text
- [ ] Information not conveyed by color alone
- [ ] Run axe DevTools or Lighthouse accessibility audit and resolve all violations
