import type React from "react";

export interface SectionLabelProps {
  num: string;
  title: string;
}

export interface DataRowProps {
  label: string;
  value: React.ReactNode;
  accent?: string;
}

export interface DerivedStatProps {
  label: string;
  value: React.ReactNode;
  accent?: string;
}
