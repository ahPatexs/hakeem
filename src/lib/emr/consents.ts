import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import {
  assertConsentRequired,
  latestConsentState,
  type ConsentState,
} from "@/domain/emr/consent";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { upsertTimelineEvent } from "./timeline";

export type ConsentStateItem = {
  typeCode: string;
  nameEn: string;
  nameAr: string;
  state: ConsentState;
  currentTextVersionId: string | null;
  currentVersion: number | null;
  lastEventAt: Date | null;
};

export async function listConsentState(
  actor: EmrActor,
  patientUserId: string,
): Promise<PlatformResult<{ items: ConsentStateItem[] }>> {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const types = await prisma.consentType.findMany({
    include: {
      versions: { orderBy: { version: "desc" } },
    },
    orderBy: { code: "asc" },
  });

  const events = await prisma.consentEvent.findMany({
    where: { patientUserId },
    include: { textVersion: { include: { type: true } } },
    orderBy: { at: "desc" },
  });

  const eventLikes = events.map((e) => ({
    typeCode: e.textVersion.type.code,
    kind: e.kind as "ACKNOWLEDGE" | "WITHDRAW",
    at: e.at,
  }));

  const items: ConsentStateItem[] = types.map((t) => {
    const latestVersion = t.versions[0] ?? null;
    const forType = events.filter((e) => e.textVersion.typeId === t.id);
    return {
      typeCode: t.code,
      nameEn: t.nameEn,
      nameAr: t.nameAr,
      state: latestConsentState(eventLikes, t.code),
      currentTextVersionId: latestVersion?.id ?? null,
      currentVersion: latestVersion?.version ?? null,
      lastEventAt: forType[0]?.at ?? null,
    };
  });

  return platformOk({ items });
}

export async function acknowledgeConsent(
  actor: EmrActor,
  input: { patientUserId: string; typeCode: string; textVersionId: string },
): Promise<PlatformResult<{ eventId: string }>> {
  const access = await assertEmrAccess(actor, input.patientUserId, "write_self");
  if (!access.ok) return access;

  const textVersion = await prisma.consentTextVersion.findUnique({
    where: { id: input.textVersionId },
    include: { type: true },
  });
  if (!textVersion || textVersion.type.code !== input.typeCode) {
    return platformFail("NOT_FOUND", "Consent text version not found");
  }

  const event = await prisma.consentEvent.create({
    data: {
      patientUserId: input.patientUserId,
      textVersionId: textVersion.id,
      kind: "ACKNOWLEDGE",
      actorUserId: actor.userId,
    },
  });

  await upsertTimelineEvent({
    patientUserId: input.patientUserId,
    type: "CONSENT",
    effectiveAt: event.at,
    refType: "ConsentEvent",
    refId: event.id,
    title: `Consent acknowledged: ${textVersion.type.code}`,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
  });

  await emrAudit({
    type: "consents.acknowledge",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { typeCode: input.typeCode, textVersionId: textVersion.id, eventId: event.id },
  });

  return platformOk({ eventId: event.id });
}

export async function withdrawConsent(
  actor: EmrActor,
  input: { patientUserId: string; typeCode: string },
): Promise<PlatformResult<{ eventId: string }>> {
  const access = await assertEmrAccess(actor, input.patientUserId, "write_self");
  if (!access.ok) return access;

  const type = await prisma.consentType.findUnique({
    where: { code: input.typeCode },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const latest = type?.versions[0];
  if (!type || !latest) {
    return platformFail("NOT_FOUND", "Consent type not found");
  }

  const event = await prisma.consentEvent.create({
    data: {
      patientUserId: input.patientUserId,
      textVersionId: latest.id,
      kind: "WITHDRAW",
      actorUserId: actor.userId,
    },
  });

  await upsertTimelineEvent({
    patientUserId: input.patientUserId,
    type: "CONSENT",
    effectiveAt: event.at,
    refType: "ConsentEvent",
    refId: event.id,
    title: `Consent withdrawn: ${type.code}`,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
  });

  await emrAudit({
    type: "consents.withdraw",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { typeCode: input.typeCode, eventId: event.id },
  });

  return platformOk({ eventId: event.id });
}

/**
 * Fail-closed consent gate for care flows (T145 / FR-045).
 * Requires the patient's latest event for `typeCode` to be ACKNOWLEDGE.
 */
export async function requireConsent(
  actor: EmrActor,
  input: { patientUserId: string; typeCode: string },
): Promise<PlatformResult<{ typeCode: string; state: "ACKNOWLEDGED" }>> {
  const access = await assertEmrAccess(actor, input.patientUserId, "read");
  if (!access.ok) return access;

  const type = await prisma.consentType.findUnique({ where: { code: input.typeCode } });
  if (!type) return platformFail("NOT_FOUND", "Consent type not found");

  const events = await prisma.consentEvent.findMany({
    where: { patientUserId: input.patientUserId, textVersion: { typeId: type.id } },
    include: { textVersion: { include: { type: true } } },
    orderBy: { at: "desc" },
  });

  const eventLikes = events.map((e) => ({
    typeCode: e.textVersion.type.code,
    kind: e.kind as "ACKNOWLEDGE" | "WITHDRAW",
    at: e.at,
  }));

  const gate = assertConsentRequired(eventLikes, input.typeCode);
  if (!gate.ok) {
    await emrAudit({
      type: "consents.gate.denied",
      outcome: "DENIED",
      actorUserId: actor.userId,
      targetUserId: input.patientUserId,
      meta: { typeCode: input.typeCode, state: gate.state },
    });
    return platformFail(
      "FORBIDDEN",
      gate.state === "WITHDRAWN"
        ? "Consent withdrawn — re-consent required"
        : "Consent not acknowledged",
    );
  }

  return platformOk({ typeCode: input.typeCode, state: "ACKNOWLEDGED" });
}
