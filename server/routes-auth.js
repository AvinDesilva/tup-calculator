"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("./db");
const {
  signAccessToken, verifyAccessToken,
  setAuthCookies, clearAuthCookies,
  hashPassword, verifyPassword,
  verifyGoogleToken, refreshTokenExpiresAt,
} = require("./lib/auth");

const router = express.Router();

// ── Validation helpers ───────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

function validateRegistration(body) {
  const { email, password, displayName } = body || {};
  if (!email || !EMAIL_RE.test(email)) return "Invalid email address";
  if (!password || password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters`;
  if (!displayName || displayName.trim().length === 0) return "Display name is required";
  return null;
}

function validateLogin(body) {
  const { email, password } = body || {};
  if (!email || !EMAIL_RE.test(email)) return "Invalid email address";
  if (!password) return "Password is required";
  return null;
}

// ── Registration rate limiting (5/hour per IP) ───────────────────────────────

const REG_LIMIT = 5;
const REG_WINDOW = 60 * 60 * 1000;
const regMap = new Map();

function checkRegLimit(ip) {
  const now = Date.now();
  let entry = regMap.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + REG_WINDOW };
  }
  entry.count++;
  regMap.set(ip, entry);
  return entry.count <= REG_LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of regMap.entries()) {
    if (now > entry.reset) regMap.delete(ip);
  }
}, 10 * 60 * 1000);

// ── Helpers ──────────────────────────────────────────────────────────────────

function createRefreshToken(userId) {
  const db = getDB();
  const id = uuidv4();
  const familyId = uuidv4();
  const expiresAt = refreshTokenExpiresAt();
  db.prepare(
    "INSERT INTO refresh_tokens (id, user_id, family_id, expires_at) VALUES (?, ?, ?, ?)"
  ).run(id, userId, familyId, expiresAt);
  return id;
}

function userResponse(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  };
}

// ── POST /auth/register ──────────────────────────────────────────────────────

router.post("/register", (req, res) => {
  const err = validateRegistration(req.body);
  if (err) return res.status(400).json({ error: err });

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (!checkRegLimit(ip)) {
    return res.status(429).json({ error: "Too many registrations. Try again later." });
  }

  const { email, password, displayName } = req.body;
  const db = getDB();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const hash = hashPassword(password);
  const result = db.prepare(
    "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
  ).run(email, hash, displayName.trim());

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  const accessToken = signAccessToken(user.id, user.email, user.display_name);
  const refreshToken = createRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({ user: userResponse(user) });
});

// ── POST /auth/login ─────────────────────────────────────────────────────────

router.post("/login", (req, res) => {
  const err = validateLogin(req.body);
  if (err) return res.status(400).json({ error: err });

  const { email, password } = req.body;
  const db = getDB();

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const accessToken = signAccessToken(user.id, user.email, user.display_name);
  const refreshToken = createRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);

  res.json({ user: userResponse(user) });
});

// ── POST /auth/google ────────────────────────────────────────────────────────

router.post("/google", async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: "ID token is required" });

  try {
    const { googleId, email, displayName, avatarUrl } = await verifyGoogleToken(idToken);
    const db = getDB();

    // Check if user exists by google_id or email
    let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);

    if (!user) {
      // Check if email already exists (link accounts)
      user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (user) {
        // Link Google to existing account
        db.prepare("UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = datetime('now') WHERE id = ?")
          .run(googleId, avatarUrl, user.id);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
      } else {
        // Create new user
        const result = db.prepare(
          "INSERT INTO users (email, google_id, display_name, avatar_url) VALUES (?, ?, ?, ?)"
        ).run(email, googleId, displayName, avatarUrl);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      }
    }

    const accessToken = signAccessToken(user.id, user.email, user.display_name);
    const refreshToken = createRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user: userResponse(user) });
  } catch (e) {
    console.error("[auth/google] verification failed:", e.message);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// ── POST /auth/refresh ───────────────────────────────────────────────────────

router.post("/refresh", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  const db = getDB();
  const row = db.prepare(
    "SELECT * FROM refresh_tokens WHERE id = ? AND revoked = 0"
  ).get(token);

  if (!row || new Date(row.expires_at) < new Date()) {
    if (row) {
      // Token reuse detected or expired — revoke entire family
      db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE family_id = ?").run(row.family_id);
    }
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  // Revoke old token
  db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?").run(token);

  // Issue new pair with same family
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(row.user_id);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "User not found" });
  }

  const newRefreshId = uuidv4();
  const expiresAt = refreshTokenExpiresAt();
  db.prepare(
    "INSERT INTO refresh_tokens (id, user_id, family_id, expires_at) VALUES (?, ?, ?, ?)"
  ).run(newRefreshId, user.id, row.family_id, expiresAt);

  const accessToken = signAccessToken(user.id, user.email, user.display_name);
  setAuthCookies(res, accessToken, newRefreshId);

  res.json({ user: userResponse(user) });
});

// ── POST /auth/logout ────────────────────────────────────────────────────────

router.post("/logout", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) {
    const db = getDB();
    db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?").run(token);
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────

router.get("/me", (req, res) => {
  const token = req.cookies?.access_token;
  if (!token) return res.json({ user: null });

  try {
    const payload = verifyAccessToken(token);
    res.json({
      user: {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
      },
    });
  } catch {
    return res.json({ user: null });
  }
});

module.exports = router;
