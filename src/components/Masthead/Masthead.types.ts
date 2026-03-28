export interface MastheadProps {
  company: string;
  meta: { sector: string; industry: string };
  isConverted: boolean;
  currencyNote: string;
  onShowMethodology: () => void;
  onReset?: () => void;
}
