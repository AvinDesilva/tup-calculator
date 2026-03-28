import type { RollFilters } from "../../lib/types.ts";

export interface DiceFilterBarProps {
  isOpen: boolean;
  activeFilters: RollFilters;
  onApply: (f: RollFilters) => void;
  onReset: () => void;
  variant?: "hero" | "compact";
}
