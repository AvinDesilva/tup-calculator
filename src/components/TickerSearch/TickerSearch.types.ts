import type React from "react";

export interface TickerSearchProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  onSubmit: () => void;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onOpenChange?: (open: boolean) => void;
}
