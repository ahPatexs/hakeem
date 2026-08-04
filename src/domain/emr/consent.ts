export type ConsentEventKind = "ACKNOWLEDGE" | "WITHDRAW";

export type ConsentEventLike = {
  typeCode: string;
  kind: ConsentEventKind;
  at: Date | string;
};

export type ConsentState = "ACKNOWLEDGED" | "WITHDRAWN" | "NONE";

/**
 * Derive the latest effective consent state for a consent type from append-only events.
 * Withdraw does not erase prior ACKNOWLEDGE events (FR-045).
 */
export function latestConsentState(
  events: readonly ConsentEventLike[],
  typeCode: string,
): ConsentState {
  const forType = events
    .filter((e) => e.typeCode === typeCode)
    .map((e) => ({
      kind: e.kind,
      atMs: typeof e.at === "string" ? Date.parse(e.at) : e.at.getTime(),
    }))
    .filter((e) => !Number.isNaN(e.atMs))
    .sort((a, b) => b.atMs - a.atMs);

  const latest = forType[0];
  if (!latest) return "NONE";
  return latest.kind === "ACKNOWLEDGE" ? "ACKNOWLEDGED" : "WITHDRAWN";
}

/**
 * Fail-closed gate: care flows that require a consent type block until
 * the latest event is ACKNOWLEDGE (FR-045 / T145).
 */
export function assertConsentRequired(
  events: readonly ConsentEventLike[],
  typeCode: string,
): { ok: true } | { ok: false; state: ConsentState } {
  const state = latestConsentState(events, typeCode);
  if (state === "ACKNOWLEDGED") return { ok: true };
  return { ok: false, state };
}
