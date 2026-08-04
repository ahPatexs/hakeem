export type BudgetSpendStatus = "ok" | "ALERT" | "BLOCKED";

/**
 * Pure budget math against month-to-date spend.
 *
 * - `thresholdPct`: alert when spend ≥ budget × thresholdPct / 100
 * - `hardCap`: when true and spend ≥ budget → BLOCKED (BUDGET_EXHAUSTED)
 * - ALERT does not block; BLOCKED implies hard cap was enabled
 */
export function checkSpend(
  spend: number,
  budget: number,
  thresholdPct: number,
  hardCap: boolean,
): BudgetSpendStatus {
  if (!Number.isFinite(spend) || !Number.isFinite(budget) || budget < 0 || spend < 0) {
    return "ok";
  }
  if (budget === 0) {
    return hardCap ? "BLOCKED" : spend > 0 ? "ALERT" : "ok";
  }
  if (hardCap && spend >= budget) {
    return "BLOCKED";
  }
  const thresholdAmount = (budget * thresholdPct) / 100;
  if (spend >= thresholdAmount) {
    return "ALERT";
  }
  return "ok";
}
