export function crPath(pts: [number, number][]): string {
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1],              p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6, cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6, cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function sampleCR(pts: [number, number][], t: number): [number, number] {
  const n   = pts.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg, lt2 = lt * lt, lt3 = lt2 * lt;
  const p0  = pts[Math.max(0, seg - 1)], p1 = pts[seg];
  const p2  = pts[seg + 1],              p3 = pts[Math.min(n, seg + 2)];
  return [
    0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*lt + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*lt2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*lt3),
    0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*lt + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*lt2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*lt3),
  ];
}

export function findTForX(pts: [number, number][], targetX: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 52; i++) {
    const mid = (lo + hi) / 2;
    if (sampleCR(pts, mid)[0] < targetX) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
