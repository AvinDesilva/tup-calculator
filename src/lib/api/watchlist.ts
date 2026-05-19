const API = "/api/watchlist";
const opts: RequestInit = { credentials: "include", headers: { "Content-Type": "application/json" } };

export interface WatchlistItem {
  ticker: string;
  companyName: string;
  paybackYears: number | null;
  verdict: string | null;
  sma200Cleared: boolean;
  currentPrice: number | null;
  sma200: number | null;
  adjPrice: number | null;
  growthRate: number | null;
  epsBase: number | null;
  addedAt: string;
  updatedAt: string;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export function getWatchlist() {
  return fetch(API, { ...opts }).then(r => handle<{ items: WatchlistItem[] }>(r)).then(d => d.items);
}

export function addToWatchlist(item: {
  ticker: string;
  companyName: string;
  paybackYears?: number | null;
  verdict?: string | null;
  sma200Cleared?: boolean;
  currentPrice?: number | null;
  sma200?: number | null;
  adjPrice?: number | null;
  growthRate?: number | null;
  epsBase?: number | null;
}) {
  return fetch(API, { ...opts, method: "POST", body: JSON.stringify(item) })
    .then(r => handle<WatchlistItem>(r));
}

export function removeFromWatchlist(ticker: string) {
  return fetch(`${API}/${encodeURIComponent(ticker)}`, { ...opts, method: "DELETE" })
    .then(r => handle<{ ok: boolean }>(r));
}

export function updateWatchlistItem(ticker: string, data: Partial<Omit<WatchlistItem, "ticker" | "companyName" | "addedAt" | "updatedAt">>) {
  return fetch(`${API}/${encodeURIComponent(ticker)}`, { ...opts, method: "PUT", body: JSON.stringify(data) })
    .then(r => handle<{ ok: boolean }>(r));
}
