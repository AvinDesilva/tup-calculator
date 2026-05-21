"use strict";

const { verifyAccessToken } = require("./lib/auth");

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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

// ── Client IP helper — works behind nginx reverse proxy ──────────────────────
// nginx sets X-Real-IP; fall back to X-Forwarded-For first entry, then socket.
function getClientIP(req) {
  const realIp = req.headers["x-real-ip"];
  if (realIp) return realIp;
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

// ── Rate limiting — 150 requests / minute per IP ──────────────────────────────
// Each ticker lookup fires ~10 parallel FMP calls, so 30/min only allowed ~3
// lookups before triggering a false 429. Bumped to 150 to allow ~15 lookups/min
// while still protecting against abuse (FMP plan allows 750/min).
const RATE_LIMIT  = 150;
const RATE_WINDOW = 60 * 1000;
const MAX_RATE_MAP_SIZE = 10000; // prevent memory exhaustion from spoofed IPs
const rateMap = new Map();

function rateLimiter(req, res, next) {
  const ip  = getClientIP(req);
  const now = Date.now();
  let entry = rateMap.get(ip);

  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + RATE_WINDOW };
  }
  entry.count++;
  rateMap.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    console.warn(`[rate-limit] blocked ${ip} — ${entry.count} requests in window`);
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
  // Hard cap: if map is still too large after pruning, clear it entirely
  if (rateMap.size > MAX_RATE_MAP_SIZE) {
    console.warn(`[rate-limit] map exceeded ${MAX_RATE_MAP_SIZE} entries — clearing`);
    rateMap.clear();
  }
}, 5 * 60 * 1000);

// ── Login brute-force protection — 10 attempts / 15 min per IP ───────────────
const LOGIN_LIMIT  = 10;
const LOGIN_WINDOW = 15 * 60 * 1000;
const loginMap = new Map();

function loginLimiter(req, res, next) {
  const ip  = getClientIP(req);
  const now = Date.now();
  let entry = loginMap.get(ip);

  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + LOGIN_WINDOW };
  }
  entry.count++;
  loginMap.set(ip, entry);

  if (entry.count > LOGIN_LIMIT) {
    console.warn(`[login-limit] blocked ${ip} — ${entry.count} attempts in window`);
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginMap.entries()) {
    if (now > entry.reset) loginMap.delete(ip);
  }
}, 10 * 60 * 1000);

// ── Auth middleware — verify JWT access token ─────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { cors, rateLimiter, loginLimiter, requireAuth, getClientIP };
