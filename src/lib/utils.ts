// ─── Number formatters ────────────────────────────────────────────────────────

/** Format a number to fixed decimal places; returns "—" for null/NaN. */
export const f = (n: number | null | undefined, d = 2): string =>
  (n == null || isNaN(n))
    ? "—"
    : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Format a large dollar amount as $T / $B / $M / $n.nn */
export const fB = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${f(n)}`;
};
