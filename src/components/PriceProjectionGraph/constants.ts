import { C } from "../../lib/theme.ts";

export type ChartPoint = {
  label: string;
  historical?: number;
  base?: number;
  bull?: number;
  bear?: number;
  sma?: number;
};

export const smaColor = "#bf5fff";

export const COLORS = {
  base: "#ffffff",
  bull: "#10d97e",
  bear: "#FF4D00",
  historical: C.accent,
  sma: smaColor,
} as const;

export const SCENARIO_RGBA = {
  base: { border: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.06)" },
  bull: { border: "rgba(16,217,126,0.2)",  bg: "rgba(16,217,126,0.06)"  },
  bear: { border: "rgba(255,77,0,0.2)",    bg: "rgba(255,77,0,0.06)"    },
  sma:  { border: "rgba(191,95,255,0.2)",  bg: "rgba(191,95,255,0.06)"  },
} as const;
