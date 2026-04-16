import type { TickerData } from "../types.ts";
import type { GuruRadarData } from "./types.ts";
import { normalizeMetrics } from "./normalizeMetrics.ts";
import { scoreGurus } from "./guruScoring.ts";
import { aggregateScore } from "./aggregateScore.ts";

export function computeGuruData(data: TickerData): GuruRadarData {
  const radar = normalizeMetrics(data);
  const gurus = scoreGurus(data);
  const { score, advice } = aggregateScore(radar);
  return { radar, gurus, overallScore: score, advice };
}
