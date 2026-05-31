/**
 * Safety-level related constants and helpers.
 */

export type SafetyLevel = "none" | "self_harm" | "harm_others" | "crisis";

/** Returns true when the safety level warrants showing the crisis card. */
export function isCrisis(level: SafetyLevel): boolean {
  return level !== "none";
}

/** Hotline information for the crisis card. */
export const CRISIS_HOTLINES = [
  { label: "安心專線（24h）", number: "1925" },
  { label: "消防救護", number: "119" },
  { label: "報案專線", number: "110" },
  { label: "張老師專線", number: "1980" },
] as const;
