"use strict";

const express = require("express");
const app  = express();
const PORT = 3001;

// ── Guard: key must be set before accepting any traffic ───────────────────────
const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) {
  console.error("[tup-proxy] FMP_API_KEY environment variable is not set. Exiting.");
  process.exit(1);
}

const FMP_BASE = "https://financialmodelingprep.com/stable";

// ── CORS — only the production domain + local dev ─────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://tupcalculator.org",
  "https://www.tupcalculator.org",
  "http://localhost:5173",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Rate limiting — 30 requests / minute per IP ───────────────────────────────
const RATE_LIMIT  = 30;
const RATE_WINDOW = 60 * 1000;
const rateMap = new Map();

app.use((req, res, next) => {
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
});

// Prune the rate map every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap.entries()) {
    if (now > entry.reset) rateMap.delete(ip);
  }
}, 5 * 60 * 1000);

// ── Proxy — /fmp/:endpoint → FMP stable API ───────────────────────────────────
app.get("/fmp/:endpoint(*)", async (req, res) => {
  const endpoint = req.params.endpoint;

  // Allowlist: FMP endpoint names are lowercase letters and hyphens only.
  // Reject anything else to prevent SSRF / path traversal.
  if (!/^[a-z0-9-]+$/.test(endpoint)) {
    return res.status(400).json({ error: "Invalid endpoint." });
  }

  // Forward the original query params (symbol, limit, period, etc.)
  const params = new URLSearchParams(req.query);
  params.set("apikey", API_KEY);

  const url = `${FMP_BASE}/${endpoint}?${params.toString()}`;

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      if (upstream.status === 401) return res.status(401).json({ error: "Invalid API key." });
      if (upstream.status === 429) return res.status(429).json({ error: "API rate limit reached." });
      return res.status(upstream.status).json({ error: "Data unavailable." });
    }

    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    console.error("[tup-proxy] upstream error:", err.message);
    res.status(502).json({ error: "Unable to reach data provider." });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

// ── Catch-all ─────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found." }));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[tup-proxy] listening on 127.0.0.1:${PORT}`);
});
