"use strict";

const express = require("express");
const helmet  = require("helmet");
const cookieParser = require("cookie-parser");
const { cors, rateLimiter } = require("./middleware");
const router = require("./routes");
const authRouter = require("./routes-auth");
const watchlistRouter = require("./routes-watchlist");
const { initDB } = require("./db");

initDB();

const app  = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ── Security & parsing ───────────────────────────────────────────────────────
// Trust the first proxy (nginx) so req.ip / X-Forwarded-For is correct
app.set("trust proxy", 1);

// Helmet adds security headers as defense-in-depth (nginx also sets them)
app.use(helmet({
  contentSecurityPolicy: false,      // managed by nginx
  strictTransportSecurity: false,    // managed by nginx
  xFrameOptions: false,             // managed by nginx (DENY)
  xContentTypeOptions: false,       // managed by nginx (nosniff)
  referrerPolicy: false,            // managed by nginx (strict-origin-when-cross-origin)
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Google OAuth popup
}));

// Cap request bodies — no endpoint needs more than 16 KB
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(cookieParser());
app.use(cors);
app.use(rateLimiter);

// ── Request logging (concise, one-line per request for monitoring) ───────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    // Log slow requests (>5s) or errors at warn level
    if (ms > 5000 || res.statusCode >= 500) {
      console.warn(`[req] ${req.method} ${req.path} ${res.statusCode} ${ms}ms ip=${req.ip}`);
    }
  });
  next();
});

app.use("/auth", authRouter);
app.use("/watchlist", watchlistRouter);
app.use(router);

// ── Global error handler — never leak stack traces ──────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[tup-proxy] unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[tup-proxy] listening on 127.0.0.1:${PORT}`);
});
