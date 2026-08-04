import type { AuditOutcome, Prisma } from "@prisma/client";
import { platformAudit } from "@/lib/platform/audit";

export type AiAuditActor = {
  userId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
};

function withAiPrefix(action: string): string {
  return action.startsWith("ai.") ? action : `ai.${action}`;
}

/**
 * AI facade over Platform append-only security audit (mirrors `emrAudit`).
 * Action examples: `conversation.create`, `prompt.publish`, `access.denied`.
 */
export async function aiAudit(
  action: string,
  actor: AiAuditActor,
  target: { userId?: string | null } | null | undefined,
  outcome: AuditOutcome,
  meta?: Prisma.InputJsonValue,
): Promise<void> {
  await platformAudit({
    type: withAiPrefix(action),
    outcome,
    actorUserId: actor.userId ?? null,
    targetUserId: target?.userId ?? null,
    ipHash: actor.ipHash ?? null,
    userAgent: actor.userAgent ?? null,
    meta,
  });
}
