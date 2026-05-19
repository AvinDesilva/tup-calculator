"use strict";

const express = require("express");
const { getDB } = require("./db");
const { requireAuth } = require("./middleware");

const router = express.Router();
const MAX_WATCHLIST_ITEMS = 50;

// All routes require authentication
router.use(requireAuth);

// ── GET /watchlist ───────────────────────────────────────────────────────────

router.get("/", (req, res) => {
  const db = getDB();
  const items = db.prepare(
    "SELECT * FROM watchlist_items WHERE user_id = ? ORDER BY added_at DESC"
  ).all(req.userId);

  res.json({
    items: items.map(row => ({
      ticker: row.ticker,
      companyName: row.company_name,
      paybackYears: row.payback_years,
      verdict: row.verdict,
      sma200Cleared: !!row.sma200_cleared,
      currentPrice: row.current_price,
      sma200: row.sma200,
      adjPrice: row.adj_price,
      growthRate: row.growth_rate,
      epsBase: row.eps_base,
      addedAt: row.added_at,
      updatedAt: row.updated_at,
    })),
  });
});

// ── POST /watchlist ──────────────────────────────────────────────────────────

router.post("/", (req, res) => {
  const { ticker, companyName, paybackYears, verdict, sma200Cleared, currentPrice, sma200, adjPrice, growthRate, epsBase } = req.body || {};

  if (!ticker || !companyName) {
    return res.status(400).json({ error: "ticker and companyName are required" });
  }

  const db = getDB();

  const count = db.prepare("SELECT COUNT(*) as n FROM watchlist_items WHERE user_id = ?").get(req.userId).n;
  if (count >= MAX_WATCHLIST_ITEMS) {
    return res.status(400).json({ error: `Watchlist is limited to ${MAX_WATCHLIST_ITEMS} items` });
  }

  try {
    db.prepare(`
      INSERT INTO watchlist_items (user_id, ticker, company_name, payback_years, verdict, sma200_cleared, current_price, sma200, adj_price, growth_rate, eps_base)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId,
      ticker.toUpperCase(),
      companyName,
      paybackYears ?? null,
      verdict ?? null,
      sma200Cleared ? 1 : 0,
      currentPrice ?? null,
      sma200 ?? null,
      adjPrice ?? null,
      growthRate ?? null,
      epsBase ?? null,
    );
  } catch (e) {
    if (e.message.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "Ticker already in watchlist" });
    }
    throw e;
  }

  const item = db.prepare(
    "SELECT * FROM watchlist_items WHERE user_id = ? AND ticker = ?"
  ).get(req.userId, ticker.toUpperCase());

  res.status(201).json({
    ticker: item.ticker,
    companyName: item.company_name,
    paybackYears: item.payback_years,
    verdict: item.verdict,
    sma200Cleared: !!item.sma200_cleared,
    currentPrice: item.current_price,
    sma200: item.sma200,
    adjPrice: item.adj_price,
    growthRate: item.growth_rate,
    epsBase: item.eps_base,
    addedAt: item.added_at,
    updatedAt: item.updated_at,
  });
});

// ── PUT /watchlist/:ticker ───────────────────────────────────────────────────

router.put("/:ticker", (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const { paybackYears, verdict, sma200Cleared, currentPrice, sma200, adjPrice, growthRate, epsBase } = req.body || {};

  const db = getDB();
  const existing = db.prepare(
    "SELECT id FROM watchlist_items WHERE user_id = ? AND ticker = ?"
  ).get(req.userId, ticker);

  if (!existing) return res.status(404).json({ error: "Ticker not in watchlist" });

  db.prepare(`
    UPDATE watchlist_items
    SET payback_years = COALESCE(?, payback_years),
        verdict = COALESCE(?, verdict),
        sma200_cleared = COALESCE(?, sma200_cleared),
        current_price = COALESCE(?, current_price),
        sma200 = COALESCE(?, sma200),
        adj_price = COALESCE(?, adj_price),
        growth_rate = COALESCE(?, growth_rate),
        eps_base = COALESCE(?, eps_base),
        updated_at = datetime('now')
    WHERE user_id = ? AND ticker = ?
  `).run(
    paybackYears ?? null,
    verdict ?? null,
    sma200Cleared != null ? (sma200Cleared ? 1 : 0) : null,
    currentPrice ?? null,
    sma200 ?? null,
    adjPrice ?? null,
    growthRate ?? null,
    epsBase ?? null,
    req.userId,
    ticker,
  );

  res.json({ ok: true });
});

// ── DELETE /watchlist/:ticker ────────────────────────────────────────────────

router.delete("/:ticker", (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const db = getDB();

  const result = db.prepare(
    "DELETE FROM watchlist_items WHERE user_id = ? AND ticker = ?"
  ).run(req.userId, ticker);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Ticker not in watchlist" });
  }

  res.json({ ok: true });
});

module.exports = router;
