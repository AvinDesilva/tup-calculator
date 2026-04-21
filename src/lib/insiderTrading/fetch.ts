import { analyzeInsiderTrades } from "./analyze.ts";
import type { FMPInsiderTrade, InsiderTradingData } from "./types.ts";

export async function fetchInsiderTrading(symbol: string): Promise<InsiderTradingData | null> {
  try {
    const res = await fetch(`/api/insider-trading?symbol=${encodeURIComponent(symbol)}&limit=40`);
    if (!res.ok) return null;
    const raw = await res.json() as FMPInsiderTrade[];
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return analyzeInsiderTrades(raw);
  } catch {
    return null;
  }
}
