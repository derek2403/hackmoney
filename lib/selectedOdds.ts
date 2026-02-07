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
