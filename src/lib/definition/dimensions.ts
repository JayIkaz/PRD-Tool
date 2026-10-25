/**
 * The seven-dimension requirement contract (Section 7), shared by the AI
 * extraction pass and the PM's manual edit form so the two can never
 * disagree about what the dimensions are.
 */
export type DimensionKey =
  | "USER"
  | "NEED"
  | "CONTEXT"
  | "BEHAVIOUR"
  | "OUTCOME"
  | "CONSTRAINTS"
  | "ACCEPTANCE_CONDITIONS";

export const DIMENSION_KEYS: DimensionKey[] = [
  "USER",
  "NEED",
  "CONTEXT",
  "BEHAVIOUR",
  "OUTCOME",
  "CONSTRAINTS",
  "ACCEPTANCE_CONDITIONS",
];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  USER: "User",
  NEED: "Need",
  CONTEXT: "Context",
  BEHAVIOUR: "Behaviour",
  OUTCOME: "Outcome",
  CONSTRAINTS: "Constraints",
  ACCEPTANCE_CONDITIONS: "Acceptance conditions",
};

/**
 * Derives a requirement's overall completeness from whatever dimension
 * rows exist for it. A dimension with no row yet counts as MISSING --
 * a requirement is never "complete" just because the dimensions it
 * happens to have rows for are DEFINED (Section 7/19).
 */
export function deriveOverallStatus(dimensionStates: string[]): "MISSING" | "PARTIAL" | "DEFINED" {
  const missingCount = DIMENSION_KEYS.length - dimensionStates.length;
  const definedOrConfirmed = dimensionStates.filter((s) => s === "DEFINED" || s === "CONFIRMED").length;
  if (missingCount === 0 && definedOrConfirmed === DIMENSION_KEYS.length) return "DEFINED";
  if (definedOrConfirmed > 0 || dimensionStates.some((s) => s === "PARTIAL")) return "PARTIAL";
  return "MISSING";
}
