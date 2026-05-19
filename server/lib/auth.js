"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_DAYS = 30;

const IS_PROD = process.env.NODE_ENV === "production";

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// ── JWT ──────────────────────────────────────────────────────────────────────

function signAccessToken(userId, email, displayName) {
  return jwt.sign({ sub: userId, email, displayName }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Cookies ──────────────────────────────────────────────────────────────────

const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "strict" : "lax",
  path: "/api",
};

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("access_token", accessToken, {
    ...COOKIE_BASE,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie("refresh_token", refreshToken, {
    ...COOKIE_BASE,
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie("access_token", { ...COOKIE_BASE });
  res.clearCookie("refresh_token", { ...COOKIE_BASE, path: "/api/auth" });
}

// ── Password ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// ── Google ────────────────────────────────────────────────────────────────────

async function verifyGoogleToken(idToken) {
  if (!googleClient) throw new Error("Google OAuth not configured");
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub,
    email: payload.email,
    displayName: payload.name || payload.email.split("@")[0],
    avatarUrl: payload.picture || null,
  };
}

// ── Refresh token helpers ────────────────────────────────────────────────────

function refreshTokenExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  setAuthCookies,
  clearAuthCookies,
  hashPassword,
  verifyPassword,
  verifyGoogleToken,
  refreshTokenExpiresAt,
  GOOGLE_CLIENT_ID,
};
