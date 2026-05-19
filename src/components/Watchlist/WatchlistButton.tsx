import { C } from "../../lib/theme.ts";

interface WatchlistButtonProps {
  ticker: string;
  isInWatchlist: boolean;
  isAuthenticated: boolean;
  onToggle: () => void;
}

export function WatchlistButton({ ticker, isInWatchlist, isAuthenticated, onToggle }: WatchlistButtonProps) {
  const label = isInWatchlist
    ? `Remove ${ticker} from watchlist`
    : isAuthenticated
      ? `Add ${ticker} to watchlist`
      : "Sign in to save to watchlist";

  return (
    <button
      onClick={onToggle}
      aria-label={label}
      title={label}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px 10px",
        fontSize: "16px",
        color: isInWatchlist ? C.accent : C.text3,
        transition: "color 0.15s",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {isInWatchlist ? "\u2605" : "\u2606"}
    </button>
  );
}
