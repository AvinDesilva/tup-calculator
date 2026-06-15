"use strict";

const express = require("express");
const { getDB } = require("./db");
const { requireAuth } = require("./middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", (req, res) => {
  const { ticker } = req.body || {};
  if (!ticker || typeof ticker !== "string") {
    return res.status(400).json({ error: "ticker is required" });
  }

  const db = getDB();
  db.prepare(
    "INSERT INTO search_history (user_id, ticker) VALUES (?, ?)"
  ).run(req.userId, ticker.toUpperCase());

  res.status(201).json({ ok: true });
});

router.get("/daily", (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 84, 1), 365);
  const db = getDB();

  const rows = db.prepare(`
    SELECT date(searched_at) AS day, COUNT(*) AS count
    FROM search_history
    WHERE user_id = ? AND searched_at >= date('now', ?)
    GROUP BY day
    ORDER BY day
  `).all(req.userId, `-${days - 1} days`);

  res.json({ days: rows.map(r => ({ date: r.day, count: r.count })) });
});

module.exports = router;
