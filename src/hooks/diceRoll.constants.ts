// ─── Dice-roll tuning constants ──────────────────────────────────────────────
//
// Request budget per roll (verify before changing any number below):
//
//   1 screener call
// + MAX_CANDIDATES × 4 endpoints   (quick phase: lookupTickerQuick)
// + MAX_QUICK_MATCHES × 7 endpoints (full phase: lookupTicker)
// = 1 + 8×4 + 2×7 = 47 FMP requests per roll (current values)
//
// Rate-limit budget:
//   - Express proxy: 300 req/min/IP (server/middleware.js:RATE_LIMIT)
//   - nginx api zone: sustained 10 r/s, burst 100 (server/nginx-rate-limits.conf)
//   - FMP plan ceiling: 750 req/min
// 47 req/roll → ~6 rolls per minute fit cleanly under the 300/min Express cap.
//
// Bumping MAX_CANDIDATES or MAX_QUICK_MATCHES costs 4 or 7 requests respectively
// per increment. Recompute the formula before raising them.

export const BATCH_SIZE         = 3;
export const MAX_CANDIDATES     = 8;
export const MAX_QUICK_MATCHES  = 2;
export const BATCH_DELAY_MS     = 200;
export const QUICK_TIMEOUT_MS   = 6000;
export const FULL_TIMEOUT_MS    = 12000;

// Fallback countdown for rate-limit errors when the server doesn't supply a
// Retry-After header (e.g. nginx-emitted 429 or FMP-upstream 429).
export const DEFAULT_RETRY_AFTER_S = 5;
