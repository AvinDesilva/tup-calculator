"use strict";

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) {
  console.error("[tup-proxy] FMP_API_KEY environment variable is not set. Exiting.");
  process.exit(1);
}

const FMP_BASE = "https://financialmodelingprep.com/stable";

function fmpUrl(endpoint, params) {
  const qs = new URLSearchParams({ ...params, apikey: API_KEY });
  return `${FMP_BASE}/${endpoint}?${qs}`;
}

async function fmpFetch(endpoint, params) {
  try {
    const res = await fetch(fmpUrl(endpoint, params));
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

module.exports = { FMP_BASE, fmpUrl, fmpFetch, median };
