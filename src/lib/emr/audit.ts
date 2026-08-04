import { platformAudit, type PlatformAuditInput } from "@/lib/platform/audit";

export type EmrAuditInput = Omit<PlatformAuditInput, "type"> & {
  /** Action suffix or full `emr.*` type; prefixed with `emr.` when missing. */
  type: string;
};

function withEmrPrefix(type: string): string {
  return type.startsWith("emr.") ? type : `emr.${type}`;
}

/** EMR facade over Platform append-only security audit (FR-040). */
export async function emrAudit(input: EmrAuditInput): Promise<void> {
  await platformAudit({
    ...input,
    type: withEmrPrefix(input.type),
  });
}
