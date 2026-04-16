export interface RadarMetricPoint {
  axis: string;      // display label
  value: number;     // 0–100 normalized
  rawLabel: string;  // human-readable (e.g. "25.3%")
}

export interface GuruScore {
  name: string;
  verdict: "Yes" | "No" | "Maybe";
  score: number;  // 0–10
}

export interface GuruRadarData {
  radar: RadarMetricPoint[];  // 14 items
  gurus: GuruScore[];         // 9 items
  overallScore: number;       // 0–100
  advice: string;             // e.g. "Accumulate / Buy"
}
