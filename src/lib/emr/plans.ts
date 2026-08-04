import { Prisma, type EmrPlanStatus } from "@prisma/client";
import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { supersededActivePlanIds } from "@/domain/emr/plan";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { upsertTimelineEvent } from "./timeline";

function toJsonInput(
  value: Prisma.InputJsonValue | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value;
}

export async function listPlans(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const items = await prisma.carePlan.findMany({
    where: { patientUserId, ...softDeleteWhere() },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return platformOk({ items });
}

export async function upsertPlan(
  actor: EmrActor,
  input: {
    patientUserId: string;
    id?: string;
    title: string;
    kind?: string;
    goals?: Prisma.InputJsonValue | null;
    interventions?: Prisma.InputJsonValue | null;
  },
) {
  const access = await assertEmrAccess(actor, input.patientUserId, "write_clinical");
  if (!access.ok) return access;

  const title = input.title.trim();
  if (!title) return platformFail("VALIDATION_ERROR", "Title is required");

  if (input.id) {
    const existing = await prisma.carePlan.findFirst({
      where: {
        id: input.id,
        patientUserId: input.patientUserId,
        status: "DRAFT",
        ...softDeleteWhere(),
      },
    });
    if (!existing) return platformFail("NOT_FOUND", "Draft plan not found");

    const row = await prisma.carePlan.update({
      where: { id: existing.id },
      data: {
        title,
        kind: input.kind?.trim() || existing.kind,
        goals: toJsonInput(input.goals),
        interventions: toJsonInput(input.interventions),
        recordedByUserId: actor.userId,
      },
    });

    await emrAudit({
      type: "plans.upsert",
      outcome: "SUCCESS",
      actorUserId: actor.userId,
      targetUserId: input.patientUserId,
      meta: { id: row.id },
    });
    return platformOk(row);
  }

  const row = await prisma.carePlan.create({
    data: {
      patientUserId: input.patientUserId,
      title,
      kind: input.kind?.trim() || "CARE",
      status: "DRAFT" satisfies EmrPlanStatus,
      goals: toJsonInput(input.goals),
      interventions: toJsonInput(input.interventions),
      recordedByUserId: actor.userId,
    },
  });

  await emrAudit({
    type: "plans.upsert",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

/** Publish creates a new ACTIVE version; prior ACTIVE becomes COMPLETED. */
export async function publishPlan(
  actor: EmrActor,
  input: { patientUserId: string; planId: string },
): Promise<PlatformResult<{ id: string; version: number }>> {
  const access = await assertEmrAccess(actor, input.patientUserId, "sign");
  if (!access.ok) return access;

  const draft = await prisma.carePlan.findFirst({
    where: {
      id: input.planId,
      patientUserId: input.patientUserId,
      status: "DRAFT",
      ...softDeleteWhere(),
    },
  });
  if (!draft) return platformFail("NOT_FOUND", "Draft plan not found");

  const signedAt = new Date();
  const published = await prisma.$transaction(async (tx) => {
    const siblings = await tx.carePlan.findMany({
      where: { patientUserId: input.patientUserId, status: "ACTIVE", deletedAt: null },
      select: { id: true, status: true, kind: true },
    });
    const supersededIds = supersededActivePlanIds(siblings, draft.id, draft.kind);
    if (supersededIds.length > 0) {
      await tx.carePlan.updateMany({
        where: { id: { in: supersededIds } },
        data: { status: "COMPLETED" },
      });
    }

    return tx.carePlan.update({
      where: { id: draft.id },
      data: {
        status: "ACTIVE",
        signedAt,
        signerUserId: actor.userId,
        recordedByUserId: actor.userId,
      },
    });
  });

  await upsertTimelineEvent({
    patientUserId: input.patientUserId,
    type: "PLAN",
    effectiveAt: signedAt,
    refType: "CarePlan",
    refId: published.id,
    title: published.title,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
  });

  await emrAudit({
    type: "plans.publish",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: published.id, version: published.version },
  });

  return platformOk({ id: published.id, version: published.version });
}
