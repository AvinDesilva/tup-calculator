"use strict";

const { Router }  = require("express");
const TTLCache    = require("./lib/cache");
const { fmpUrl, fmpFetch } = require("./lib/fmp");

const router = Router();

const fmpCache          = new TTLCache(5 * 60 * 1000,      500);  // 5 min
const priceHistoryCache = new TTLCache(60 * 60 * 1000,     200);  // 1 hr

// ── Search — parallel symbol + name search, merged & ranked ─────────────────
const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "NYSEAMERICAN", "NYSEARCA", "BATS", "CBOE"]);

router.get("/search", async (req, res) => {
  const query = (req.query.query || "").toString().trim();
  if (query.length < 2) {
    return res.status(400).json({ error: "Query must be at least 2 characters." });
  }

  const limit      = Math.min(parseInt(req.query.limit, 10) || 10, 20);
  const fetchLimit = String(limit + 10); // over-fetch to have room after dedup

  try {
    const [symbolRes, nameRes] = await Promise.all([
      fmpFetch("search-symbol", { query, limit: fetchLimit }),
      fmpFetch("search-name",   { query, limit: fetchLimit }),
    ]);

    // Merge: symbol results first (more relevant for ticker queries), then name results
    const seen = new Set();
    const merged = [];
    for (const item of [...symbolRes, ...nameRes]) {
      if (!item.symbol || seen.has(item.symbol)) continue;
      seen.add(item.symbol);
      merged.push(item);
    }

    // Sort: US exchanges first, then exact symbol match, then alphabetical
    const uq = query.toUpperCase();
    merged.sort((a, b) => {
      const aUS = US_EXCHANGES.has((a.exchange || "").toUpperCase()) ? 0 : 1;
      const bUS = US_EXCHANGES.has((b.exchange || "").toUpperCase()) ? 0 : 1;
      if (aUS !== bUS) return aUS - bUS;
      const aExact = a.symbol.toUpperCase() === uq ? 0 : 1;
      const bExact = b.symbol.toUpperCase() === uq ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.symbol.localeCompare(b.symbol);
    });

    res.json(merged.slice(0, limit));
  } catch (err) {
    console.error("[tup-proxy] search error:", err.message);
    res.status(502).json({ error: "Unable to reach data provider." });
  }
});

// ── Insider Trading ──────────────────────────────────────────────────────────
router.get("/insider-trading", async (req, res) => {
  const symbol = (req.query.symbol || "").toString().toUpperCase().trim();
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid symbol." });
  }
  const limit = Math.min(parseInt(req.query.limit || "40", 10) || 40, 100);

  const cacheKey = `insider:${symbol}:${limit}`;
  const cached = fmpCache.get(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    const url = fmpUrl("insider-trading/search", { symbol, limit });
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Insider trading data unavailable." });
    }
    const data = await upstream.json();
    fmpCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("[tup-proxy] insider-trading error:", err.message);
    res.status(502).json({ error: "Unable to fetch insider trading data." });
  }
});

// ── Historical Price ─────────────────────────────────────────────────────────
router.get("/historical-price", async (req, res) => {
  const symbol = (req.query.symbol || "").toString().toUpperCase().trim();
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid symbol." });
  }
  const cacheKey = `hist:${symbol}`;
  const cached = priceHistoryCache.get(cacheKey);
  if (cached !== undefined) return res.json(cached);
  try {
    // Yahoo Finance unofficial API — no key required.
    // Weekly interval gives ~520 pts for 10yr; the component samples to monthly
    // for 5Y/10Y views and uses raw weekly for the 2Y detail view.
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=10y&includePrePost=false`;
    const upstream = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!upstream.ok) {
      console.warn(`[tup-proxy] historical-price: Yahoo returned ${upstream.status} for ${symbol}`);
      return res.json({ priceHistory: [] });
    }
    const data = await upstream.json();
    const result0 = data?.chart?.result?.[0];
    if (!result0) {
      console.warn(`[tup-proxy] historical-price: Yahoo empty response for ${symbol}`);
      return res.json({ priceHistory: [] });
    }
    const timestamps = result0.timestamp ?? [];
    const closes = result0.indicators?.adjclose?.[0]?.adjclose ?? result0.indicators?.quote?.[0]?.close ?? [];
    // Build raw array oldest→newest, dropping null closes
    const raw = timestamps
      .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] }))
      .filter(p => p.close != null && isFinite(p.close));
    console.log(`[tup-proxy] historical-price: Yahoo returned ${raw.length} rows for ${symbol}`);

    // Return weekly points oldest→newest, capped at 520 (~10yr).
    const result = { priceHistory: raw.slice(-520) };
    priceHistoryCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("[tup-proxy] historical-price error:", err.message);
    res.json({ priceHistory: [] });
  }
});

// ── Proxy — /fmp/:endpoint → FMP stable API ───────────────────────────────────
router.get("/fmp/:endpoint(*)", async (req, res) => {
  const endpoint = req.params.endpoint;

  // Allowlist: FMP endpoint names are lowercase letters and hyphens only.
  // Reject anything else to prevent SSRF / path traversal.
  if (!/^[a-z0-9-]+$/.test(endpoint)) {
    return res.status(400).json({ error: "Invalid endpoint." });
  }

  // Forward the original query params (symbol, limit, period, etc.)
  const url = fmpUrl(endpoint, req.query);

  const cached = fmpCache.get(url);
  if (cached !== undefined) return res.json(cached);

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      const upBody = await upstream.text().catch(() => "(no body)");
      console.error(`[tup-proxy] FMP ${upstream.status} for /${endpoint}`, upBody.slice(0, 200));
      if (upstream.status === 401) return res.status(401).json({ error: "Invalid API key." });
      if (upstream.status === 429) return res.status(429).json({ error: "API rate limit reached." });
      return res.status(upstream.status).json({ error: "Data unavailable." });
    }

    const data = await upstream.json();
    fmpCache.set(url, data);
    res.json(data);
  } catch (err) {
    console.error("[tup-proxy] upstream error:", err.message);
    res.status(502).json({ error: "Unable to reach data provider." });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.json({ ok: true }));

// ── Catch-all ─────────────────────────────────────────────────────────────────
router.use((_req, res) => res.status(404).json({ error: "Not found." }));

module.exports = router;
