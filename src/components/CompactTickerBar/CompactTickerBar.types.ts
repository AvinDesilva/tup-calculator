import type { RollFilters } from "../../lib/types.ts";

export interface CompactTickerBarProps {
  ticker: string;
  onTickerChange: (v: string) => void;
  onTickerSelect: (v: string) => void;
  onFetch: () => void;
  loading: boolean;
  error: string;
  fetchLog: string[];
  onRollDice: () => void;
  onCancelDice: () => void;
  rollingDice: boolean;
  dicePhrase: string;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  rollFilters: RollFilters;
  onApplyFilters: (f: RollFilters) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}
