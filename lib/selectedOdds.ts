/**
 * Joint outcomes and "For The Win" probability for the 3-question market.
 * Used by Visualizations (Selected Odds card) and TradeSidebar (Avg. Price / to-win).
 */

export const JOINT_OUTCOMES = [
  { id: 1, outcomes: [false, false, false], description: "Khamenei No, US No, Israel No", probability: 6.00 },
  { id: 2, outcomes: [false, false, true], description: "Khamenei No, US No, Israel Yes", probability: 6.00 },
  { id: 3, outcomes: [false, true, false], description: "Khamenei No, US Yes, Israel No", probability: 9.00 },
  { id: 4, outcomes: [false, true, true], description: "Khamenei No, US Yes, Israel Yes", probability: 9.00 },
  { id: 5, outcomes: [true, false, false], description: "Khamenei Yes, US No, Israel No", probability: 14.00 },
  { id: 6, outcomes: [true, false, true], description: "Khamenei Yes, US No, Israel Yes", probability: 14.00 },
  { id: 7, outcomes: [true, true, false], description: "Khamenei Yes, US Yes, Israel No", probability: 21.00 },
  { id: 8, outcomes: [true, true, true], description: "Khamenei Yes, US Yes, Israel Yes", probability: 21.00 },
] as const;

type Outcome = (typeof JOINT_OUTCOMES)[number];

export function doesOutcomeMatch(
  outcome: Outcome,
  selections: Record<number, string | null>
): boolean {
  for (let qId = 1; qId <= 3; qId++) {
    const selection = selections[qId];
    if (selection === null || selection === "Any") continue;
    const outcomeValue = outcome.outcomes[qId - 1];
    const isYes = selection === "Yes";
    if ((isYes && !outcomeValue) || (!isYes && outcomeValue)) return false;
  }
  return true;
}

/** Returns the "For The Win" percentage (0–100) for the current selections, or null if none. */
export function calculateSelectedMarketProbability(
  selections: Record<number, string | null>
): number | null {
  const hasSelection = Object.values(selections).some((s) => s !== null);
  if (!hasSelection) return null;
  let total = 0;
  for (const outcome of JOINT_OUTCOMES) {
    if (doesOutcomeMatch(outcome, selections)) total += outcome.probability;
  }
  return total;
}

/** Sum of probabilities for the given outcome ids (for multi-select). */
export function probabilitySumForOutcomeIds(ids: number[]): number {
  let sum = 0;
  for (const outcome of JOINT_OUTCOMES) {
    if (ids.includes(outcome.id)) sum += outcome.probability;
  }
  return sum;
}

/** Convert a single outcome id to selections (for sidebar display). */
export function outcomeIdToSelections(id: number): Record<number, string | null> | null {
  const outcome = JOINT_OUTCOMES.find((o) => o.id === id);
  if (!outcome) return null;
  return {
    1: outcome.outcomes[0] ? "Yes" : "No",
    2: outcome.outcomes[1] ? "Yes" : "No",
    3: outcome.outcomes[2] ? "Yes" : "No",
  };
}

/** Return outcome ids that match the given selections (for sidebar → table sync). */
export function selectionsToOutcomeIds(selections: Record<number, string | null>): number[] {
  return JOINT_OUTCOMES.filter((o) => doesOutcomeMatch(o, selections)).map((o) => o.id);
}

/** For multi-select: derive Yes/No/Any per question from selected outcome ids. */
export function selectedOutcomeIdsToSelections(
  ids: number[]
): Record<number, string | null> {
  if (ids.length === 0) return { 1: null, 2: null, 3: null };
  if (ids.length === 1) {
    const s = outcomeIdToSelections(ids[0]!);
    return s ?? { 1: null, 2: null, 3: null };
  }
  const outcomes = JOINT_OUTCOMES.filter((o) => ids.includes(o.id));
  const result: Record<number, string | null> = { 1: null, 2: null, 3: null };
  for (let q = 1; q <= 3; q++) {
    const vals = outcomes.map((o) => o.outcomes[q - 1]);
    const allTrue = vals.every(Boolean);
    const allFalse = vals.every((v) => !v);
    result[q as 1] = allTrue ? "Yes" : allFalse ? "No" : "Any";
  }
  return result;
}
