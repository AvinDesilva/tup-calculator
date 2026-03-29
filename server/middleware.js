"use strict";

// ── CORS — only the production domain + local dev ─────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://tupcalculator.org",
  "https://www.tupcalculator.org",
  "https://dev.tupcalculator.org",
  "http://localhost:5173",
]);

function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

// ── Rate limiting — 150 requests / minute per IP ──────────────────────────────
// Each ticker lookup fires ~10 parallel FMP calls, so 30/min only allowed ~3
// lookups before triggering a false 429. Bumped to 150 to allow ~15 lookups/min
// while still protecting against abuse (FMP plan allows 750/min).
const RATE_LIMIT  = 150;
const RATE_WINDOW = 60 * 1000;
const rateMap = new Map();

function rateLimiter(req, res, next) {
  const ip  = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateMap.get(ip);

  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + RATE_WINDOW };
  }
  entry.count++;
  rateMap.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }
  next();
}

// Prune the rate map every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap.entries()) {
    if (now > entry.reset) rateMap.delete(ip);
  }
}, 5 * 60 * 1000);

module.exports = { cors, rateLimiter };
