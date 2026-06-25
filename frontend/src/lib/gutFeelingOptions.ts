export const GUT_FEELING_PERCENT_OPTIONS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export type GutFeelingPercent = (typeof GUT_FEELING_PERCENT_OPTIONS)[number];
