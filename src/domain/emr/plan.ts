/**
 * Publishing a draft care plan makes it the single ACTIVE plan for its kind;
 * any other ACTIVE plan of the same kind for the patient is superseded to
 * COMPLETED. Pure so the invariant can be unit tested without a database.
 */
export function supersededActivePlanIds(
  plans: ReadonlyArray<{ id: string; status: string; kind: string }>,
  publishedPlanId: string,
  kind: string,
): string[] {
  return plans
    .filter((p) => p.id !== publishedPlanId && p.kind === kind && p.status === "ACTIVE")
    .map((p) => p.id);
}
