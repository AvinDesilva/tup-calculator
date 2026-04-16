import type { RadarMetricPoint } from "./types.ts";

// Metric indices in the radar array (must match normalizeMetrics order):
// 0: Op Margin, 1: Gross Margin, 2: Net Margin, 3: ROE, 4: ROA,
// 5: Low Beta, 6: Low D/E, 7: Current Ratio, 8: FCF Margin, 9: FCF Yield,
// 10: EPS Growth, 11: Rev Growth, 12: Value (P/E), 13: Piotroski

const WEIGHTS: number[] = [
  0.08,  // Op Margin       (profitability 30% / 5 = 6% each, but op margin gets slightly more)
  0.06,  // Gross Margin
  0.06,  // Net Margin
  0.06,  // ROE
  0.04,  // ROA
  0.05,  // Low Beta        (value 25%)
  0.05,  // Low D/E         (quality 20%)
  0.05,  // Current Ratio
  0.06,  // FCF Margin      (value)
  0.07,  // FCF Yield       (value)
  0.12,  // EPS Growth      (growth 25%)
  0.12,  // Rev Growth
  0.07,  // Value (P/E)     (value)
  0.11,  // Piotroski       (quality)
];

export function aggregateScore(radar: RadarMetricPoint[]): { score: number; advice: string } {
  let total = 0;
  let weightSum = 0;
  for (let i = 0; i < radar.length && i < WEIGHTS.length; i++) {
    total += radar[i].value * WEIGHTS[i];
    weightSum += WEIGHTS[i];
  }
  const score = weightSum > 0 ? Math.round(total / weightSum) : 0;

  let advice: string;
  if (score >= 80)      advice = "Strong Buy";
  else if (score >= 70) advice = "Accumulate / Buy";
  else if (score >= 60) advice = "Accumulate / Weak Buy";
  else if (score >= 50) advice = "Hold";
  else if (score >= 40) advice = "Reduce / Weak Sell";
  else if (score >= 30) advice = "Sell";
  else                  advice = "Strong Sell";

  return { score, advice };
}
