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

// ── Rate limiting — 150 requests / minute per IP ──────────────────────────────
// Each ticker lookup fires ~10 parallel FMP calls, so 30/min only allowed ~3
// lookups before triggering a false 429. Bumped to 150 to allow ~15 lookups/min
// while still protecting against abuse (FMP plan allows 750/min).
const RATE_LIMIT  = 150;
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

// ── Search — parallel symbol + name search, merged & ranked ─────────────────
const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "NYSEAMERICAN", "NYSEARCA", "BATS", "CBOE"]);

app.get("/search", async (req, res) => {
  const query = (req.query.query || "").toString().trim();
  if (query.length < 2) {
    return res.status(400).json({ error: "Query must be at least 2 characters." });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
  const fetchLimit = String(limit + 10); // over-fetch to have room after dedup

  const symbolParams = new URLSearchParams({ query, limit: fetchLimit, apikey: API_KEY });
  const nameParams   = new URLSearchParams({ query, limit: fetchLimit, apikey: API_KEY });

  try {
    const [symbolRes, nameRes] = await Promise.all([
      fetch(`${FMP_BASE}/search-symbol?${symbolParams}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${FMP_BASE}/search-name?${nameParams}`).then(r => r.ok ? r.json() : []).catch(() => []),
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

// ── In-memory TTL cache for FMP responses ────────────────────────────────────
const CACHE_TTL   = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX   = 500;
const fmpCache    = new Map(); // key → { data, expiry }

function cacheGet(key) {
  const entry = fmpCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) { fmpCache.delete(key); return undefined; }
  return entry.data;
}

function cacheSet(key, data) {
  // Evict expired entries when approaching capacity
  if (fmpCache.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of fmpCache.entries()) {
      if (now > v.expiry) fmpCache.delete(k);
    }
    // If still over limit, delete oldest entries
    if (fmpCache.size >= CACHE_MAX) {
      const it = fmpCache.keys();
      while (fmpCache.size >= CACHE_MAX) {
        const oldest = it.next();
        if (oldest.done) break;
        fmpCache.delete(oldest.value);
      }
    }
  }
  fmpCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// ── Industry growth cache (6-hour TTL, 200 max entries) ─────────────────────
const INDUSTRY_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const INDUSTRY_CACHE_MAX = 200;
const industryCache = new Map();

function industryCacheGet(key) {
  const entry = industryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) { industryCache.delete(key); return undefined; }
  return entry.data;
}

function industryCacheSet(key, data) {
  if (industryCache.size >= INDUSTRY_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of industryCache.entries()) {
      if (now > v.expiry) industryCache.delete(k);
    }
    if (industryCache.size >= INDUSTRY_CACHE_MAX) {
      const it = industryCache.keys();
      while (industryCache.size >= INDUSTRY_CACHE_MAX) {
        const oldest = it.next();
        if (oldest.done) break;
        industryCache.delete(oldest.value);
      }
    }
  }
  industryCache.set(key, { data, expiry: Date.now() + INDUSTRY_CACHE_TTL });
}

// ── Industry Blended Growth Rate endpoint ───────────────────────────────────
app.get("/industry-growth", async (req, res) => {
  const industry = (req.query.industry || "").toString().trim();
  if (!industry) {
    return res.status(400).json({ error: "Missing 'industry' parameter." });
  }
  const exclude = (req.query.exclude || "").toString().trim().toUpperCase();
  const cacheKey = industry.toLowerCase();

  const cached = industryCacheGet(cacheKey);
  if (cached !== undefined) {
    return res.json(cached);
  }

  try {
    // 1. Fetch industry constituents via company-screener
    const screenerParams = new URLSearchParams({
      industry,
      isActivelyTrading: "true",
      limit: "50",
      apikey: API_KEY,
    });
    const screenerRes = await fetch(`${FMP_BASE}/company-screener?${screenerParams}`);
    if (!screenerRes.ok) {
      return res.status(502).json({ error: "Unable to fetch industry constituents." });
    }
    const screenerData = await screenerRes.json();
    if (!Array.isArray(screenerData) || screenerData.length === 0) {
      return res.json({ industry, error: "Insufficient data", count: 0 });
    }

    // 2. Sort by market cap desc, take top 25 (excluding the target company)
    const sorted = screenerData
      .filter(c => c.symbol && c.symbol.toUpperCase() !== exclude)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 25);

    if (sorted.length < 3) {
      return res.json({ industry, error: "Insufficient data", count: sorted.length });
    }

    // 3. Fetch growth data for each constituent in batches of 10
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 100;
    const constituentResults = [];

    for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY));
      const batch = sorted.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (company) => {
        const sym = company.symbol;
        try {
          const [growthRes, estimatesRes, quoteRes] = await Promise.allSettled([
            fetch(`${FMP_BASE}/financial-growth?symbol=${encodeURIComponent(sym)}&limit=10&apikey=${API_KEY}`).then(r => r.ok ? r.json() : []),
            fetch(`${FMP_BASE}/analyst-estimates?symbol=${encodeURIComponent(sym)}&period=annual&limit=5&apikey=${API_KEY}`).then(r => r.ok ? r.json() : []),
            fetch(`${FMP_BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${API_KEY}`).then(r => r.ok ? r.json() : []),
          ]);

          const growthData = growthRes.status === "fulfilled" ? growthRes.value : [];
          const estimatesData = estimatesRes.status === "fulfilled" ? estimatesRes.value : [];
          const quoteData = quoteRes.status === "fulfilled" ? quoteRes.value : [];

          // Historical EPS growth — median of YoY rates (matches frontend approach),
          // filtering outliers |g| >= 10
          const growthArr = Array.isArray(growthData) ? growthData : [];
          const epsGrowthRates = growthArr
            .map(g => g.epsgrowth || g.epsGrowth || 0)
            .filter(g => typeof g === "number" && isFinite(g) && Math.abs(g) < 10);

          if (epsGrowthRates.length === 0) return null;

          // Median (robust to negative/volatile growth years)
          const sortedRates = [...epsGrowthRates].sort((a, b) => a - b);
          const mid = Math.floor(sortedRates.length / 2);
          const historicalGrowth = sortedRates.length % 2 !== 0
            ? sortedRates[mid]
            : (sortedRates[mid - 1] + sortedRates[mid]) / 2;

          // Forward CAGR from analyst estimates
          let fwdCAGR = null;
          const estimates = Array.isArray(estimatesData) ? estimatesData : [];
          if (estimates.length >= 1) {
            // Sort by date ascending
            const sorted = [...estimates].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
            const baseEPS = quoteData?.[0]?.eps;
            if (baseEPS && baseEPS > 0) {
              if (sorted.length >= 3 && sorted[2].epsAvg && sorted[2].epsAvg > 0) {
                // 3-year CAGR: (EPS_T+2 / EPS_T)^(1/3) - 1
                fwdCAGR = Math.pow(sorted[2].epsAvg / baseEPS, 1 / 3) - 1;
              } else if (sorted.length >= 2 && sorted[1].epsAvg && sorted[1].epsAvg > 0) {
                // 2-year fallback: sqrt(EPS_T+1 / EPS_T) - 1
                fwdCAGR = Math.sqrt(sorted[1].epsAvg / baseEPS) - 1;
              } else if (sorted[0].epsAvg && sorted[0].epsAvg > 0) {
                // 1-year fallback
                fwdCAGR = (sorted[0].epsAvg / baseEPS) - 1;
              }
            }
          }

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

          // Sanity check — skip extreme outliers
          if (!isFinite(blended) || Math.abs(blended) > 2) return null;

          // Simplified TUP payback (price-based, no debt/cash adjustment)
          const price = quoteData?.[0]?.price || company.price || 0;
          const eps = quoteData?.[0]?.eps || 0;
          let payback = null;
          if (eps > 0 && price > 0 && blended > 0) {
            let cum = 0, epsY = eps;
            for (let y = 1; y <= 30; y++) {
              epsY *= (1 + blended);
              cum += epsY;
              if (cum >= price) { payback = y; break; }
            }
          }

          return { symbol: sym, companyName: company.companyName || sym, blended, payback };
        } catch {
          return null;
        }
      });
      const results = await Promise.all(batchPromises);
      constituentResults.push(...results);
    }

    // 4. Filter valid results, compute median + percentiles
    const valid = constituentResults.filter(r => r != null);
    if (valid.length < 3) {
      return res.json({ industry, error: "Insufficient data", count: valid.length });
    }

    const rates = valid.map(r => r.blended * 100).sort((a, b) => a - b);
    const median = rates.length % 2 === 1
      ? rates[Math.floor(rates.length / 2)]
      : (rates[rates.length / 2 - 1] + rates[rates.length / 2]) / 2;
    const p25idx = Math.floor(rates.length * 0.25);
    const p75idx = Math.floor(rates.length * 0.75);
    const p25 = rates[p25idx];
    const p75 = rates[Math.min(p75idx, rates.length - 1)];

    // Top 3 peers with valid payback, sorted by market cap (already in order from screener)
    const peers = valid
      .filter(r => r.payback != null && r.payback > 0)
      .slice(0, 3)
      .map(r => ({ symbol: r.symbol, companyName: r.companyName, payback: r.payback }));

    const result = {
      industry,
      median: parseFloat(median.toFixed(1)),
      p25: parseFloat(p25.toFixed(1)),
      p75: parseFloat(p75.toFixed(1)),
      count: valid.length,
      constituents: valid.map(r => r.symbol),
      peers,
    };

    industryCacheSet(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("[tup-proxy] industry-growth error:", err.message);
    res.status(502).json({ error: "Unable to compute industry growth." });
  }
});

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

  // Check cache first
  const cached = cacheGet(url);
  if (cached !== undefined) {
    return res.json(cached);
  }

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
    cacheSet(url, data);
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
