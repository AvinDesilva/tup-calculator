"use strict";

const { Router }  = require("express");
const TTLCache    = require("./lib/cache");
const { fmpUrl, fmpFetch, median } = require("./lib/fmp");

const router = Router();

const fmpCache          = new TTLCache(5 * 60 * 1000,      500);  // 5 min
const industryCache     = new TTLCache(6 * 60 * 60 * 1000,  200);  // 6 hrs
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

// ── Industry Blended Growth Rate ─────────────────────────────────────────────

function computeForwardCAGR(estimates, baseEPS) {
  if (!estimates.length || !baseEPS || baseEPS <= 0) return null;

  const sorted = [...estimates].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (sorted.length >= 3 && sorted[2].epsAvg > 0) {
    return Math.pow(sorted[2].epsAvg / baseEPS, 1 / 3) - 1;
  }
  if (sorted.length >= 2 && sorted[1].epsAvg > 0) {
    return Math.sqrt(sorted[1].epsAvg / baseEPS) - 1;
  }
  if (sorted[0].epsAvg > 0) {
    return (sorted[0].epsAvg / baseEPS) - 1;
  }
  return null;
}

async function fetchConstituentGrowth(symbol) {
  const [growthRes, estimatesRes, quoteRes] = await Promise.allSettled([
    fmpFetch("financial-growth",  { symbol, limit: "10" }),
    fmpFetch("analyst-estimates", { symbol, period: "annual", limit: "5" }),
    fmpFetch("quote",             { symbol }),
  ]);

  const growthData    = growthRes.status    === "fulfilled" ? growthRes.value    : [];
  const estimatesData = estimatesRes.status === "fulfilled" ? estimatesRes.value : [];
  const quoteData     = quoteRes.status     === "fulfilled" ? quoteRes.value     : [];

  // Historical EPS growth — median of YoY rates, winsorized to ±100%
  // so extreme years (turnarounds, low-base spikes) contribute directional
  // drag without dominating the average
  const epsGrowthRates = (Array.isArray(growthData) ? growthData : [])
    .map(g => g.epsgrowth || g.epsGrowth || 0)
    .filter(g => typeof g === "number" && isFinite(g))
    .map(g => Math.max(-1, Math.min(1, g)));

  if (epsGrowthRates.length === 0) return null;

  const historicalGrowth = median(epsGrowthRates);
  const fwdCAGR = computeForwardCAGR(
    Array.isArray(estimatesData) ? estimatesData : [],
    quoteData?.[0]?.eps,
  );

  // Dividend yield
  let dividendYield = 0;
  const qd = quoteData?.[0]?.dividendYield;
  if (typeof qd === "number" && isFinite(qd) && qd >= 0 && qd <= 25) {
    dividendYield = qd / 100;
  }

  // Blended growth (same formula as calcTUP.ts:47-49)
  const blended = fwdCAGR != null
    ? (historicalGrowth + fwdCAGR) / 2 + dividendYield
    : historicalGrowth + dividendYield;

  if (!isFinite(blended) || Math.abs(blended) > 2) return null;

  return { symbol, blended };
}

router.get("/industry-growth", async (req, res) => {
  const industry = (req.query.industry || "").toString().trim();
  if (!industry) {
    return res.status(400).json({ error: "Missing 'industry' parameter." });
  }
  const exclude  = (req.query.exclude || "").toString().trim().toUpperCase();
  const cacheKey = industry.toLowerCase();

  const cached = industryCache.get(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    // 1. Fetch industry constituents via company-screener
    const screenerRes = await fetch(fmpUrl("company-screener", {
      industry, isActivelyTrading: "true", limit: "50",
    }));
    if (!screenerRes.ok) {
      return res.status(502).json({ error: "Unable to fetch industry constituents." });
    }
    const screenerData = await screenerRes.json();
    if (!Array.isArray(screenerData) || screenerData.length === 0) {
      return res.json({ industry, error: "Insufficient data", count: 0 });
    }

    // 2. Top 25 by market cap, excluding the target company
    const peers = screenerData
      .filter(c => c.symbol && c.symbol.toUpperCase() !== exclude)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 25);

    if (peers.length < 3) {
      return res.json({ industry, error: "Insufficient data", count: peers.length });
    }

    // 3. Fetch growth data in batches of 10
    const BATCH_SIZE  = 10;
    const BATCH_DELAY = 100;
    const allResults  = [];

    for (let i = 0; i < peers.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY));
      const batch = peers.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(c => fetchConstituentGrowth(c.symbol).catch(() => null))
      );
      allResults.push(...results);
    }

    // 4. Compute stats
    const valid = allResults.filter(Boolean);
    if (valid.length < 3) {
      return res.json({ industry, error: "Insufficient data", count: valid.length });
    }

    const rates = valid.map(r => r.blended * 100).sort((a, b) => a - b);
    const p25   = rates[Math.floor(rates.length * 0.25)];
    const p75   = rates[Math.min(Math.floor(rates.length * 0.75), rates.length - 1)];

    const result = {
      industry,
      median: parseFloat(median(rates).toFixed(1)),
      p25:    parseFloat(p25.toFixed(1)),
      p75:    parseFloat(p75.toFixed(1)),
      count:  valid.length,
      constituents: valid.map(r => r.symbol),
    };

    industryCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("[tup-proxy] industry-growth error:", err.message);
    res.status(502).json({ error: "Unable to compute industry growth." });
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
    // FMP stable API uses "historical-price-eod" with symbol as query param.
    // Returns: { symbol, historical: [{ date, open, high, low, close, volume, ... }] }
    // Data is newest-first; we reverse and sample to monthly.
    const url = fmpUrl("historical-price-eod", { symbol, limit: 1260 });
    const upstream = await fetch(url);
    if (!upstream.ok) {
      console.warn(`[tup-proxy] FMP historical-price-eod ${upstream.status} for ${symbol}`);
      return res.json({ priceHistory: [] });
    }
    const data = await upstream.json();

    // Support both array response and {historical:[]} envelope
    const raw = Array.isArray(data) ? data : (data.historical || []);

    // Sample to monthly — keep first trading day per calendar month, oldest→newest
    const daily = raw.slice().reverse();
    const monthly = [];
    let prevMonth = null;
    for (const pt of daily) {
      const mo = pt.date.slice(0, 7); // "YYYY-MM"
      if (mo !== prevMonth) { monthly.push({ date: pt.date, close: pt.close }); prevMonth = mo; }
    }
    const result = { priceHistory: monthly.slice(-60) };
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
