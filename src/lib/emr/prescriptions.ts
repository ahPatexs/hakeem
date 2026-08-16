import { verifyPassword } from "@/auth/passwords";
import { isTerminalForClinicalWork } from "@/domain/doctor/consultation";
import { DomainRuleError, type DomainRuleCode } from "@/domain/doctor/errors";
import {
  assertHasLines,
  assertSafeToSign,
  type PrescriptionLineInput,
} from "@/domain/doctor/prescriptions";
import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { checkSoftConcurrency } from "@/domain/emr/versioning";
import {
  platformFail,
  platformOk,
  type PlatformCode,
  type PlatformResult,
} from "@/domain/platform/outcomes";
import { assertSignedArtifactMutable } from "@/lib/platform/documents";
import { runSafetyCheck } from "@/lib/platform/safety";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { inChartSearch, type InChartSearchFilters } from "./search";
import { upsertTimelineEvent } from "./timeline";

export type PrescriptionBucket = "active" | "history" | "all";

const DOCTOR_INBOX_PAGE_SIZE = 12;

const DOMAIN_TO_PLATFORM_CODE: Record<DomainRuleCode, PlatformCode> = {
  NOT_FOUND: "NOT_FOUND",
  INVALID_STATUS: "CONFLICT",
  ALREADY_IN_PROGRESS: "CONFLICT",
  SIGN_REQUIREMENTS: "FORBIDDEN",
  ALLERGY_BLOCK: "FORBIDDEN",
  SAFETY_ACK_REQUIRED: "VALIDATION_ERROR",
  JOIN_WINDOW_CLOSED: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
};

/** Translate a thrown doctor-domain rule violation into a facade PlatformResult. */
function domainErrorToPlatform(error: unknown): PlatformResult<never> {
  if (error instanceof DomainRuleError) {
    return platformFail(DOMAIN_TO_PLATFORM_CODE[error.code], error.message);
  }
  throw error;
}

export async function listPrescriptions(
  actor: EmrActor,
  patientUserId: string,
  opts: { bucket?: PrescriptionBucket } & InChartSearchFilters = {},
) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(opts);
  const bucket = opts.bucket ?? "active";

  const where = {
    patientUserId,
    ...softDeleteWhere(),
    ...(bucket === "active"
      ? { status: "ACTIVE" as const }
      : bucket === "history"
        ? { status: { in: ["COMPLETED" as const, "CANCELLED" as const, "EXPIRED" as const] } }
        : {}),
  };

  const [total, items] = await Promise.all([
    prisma.prescription.count({ where }),
    prisma.prescription.findMany({
      where,
      orderBy: { prescribedAt: "desc" },
      skip: search.skip,
      take: search.take,
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return platformOk({
    items,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}

export async function getPrescription(
  actor: EmrActor,
  prescriptionId: string,
) {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, ...softDeleteWhere() },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      document: true,
    },
  });
  if (!rx) return platformFail("NOT_FOUND", "Prescription not found");

  const access = await assertEmrAccess(actor, rx.patientUserId, "read");
  if (!access.ok) return access;

  // Patients do not see drafts
  if (actor.role === "PATIENT" && rx.status === "DRAFT") {
    return platformFail("NOT_FOUND", "Prescription not found");
  }

  await emrAudit({
    type: "prescriptions.view",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: rx.patientUserId,
    meta: { prescriptionId: rx.id },
  });

  return platformOk(rx);
}

/**
 * Doctor inbox: prescriptions authored by this doctor across their whole panel
 * (T127). Distinct from `listPrescriptions`, which is patient-scoped.
 */
export async function listPrescriptionsForDoctor(
  actor: EmrActor,
  opts: { page?: number; status?: "DRAFT" | "ACTIVE" | "ALL" } = {},
) {
  if (actor.role !== "DOCTOR" || !actor.doctorId) {
    return platformFail("FORBIDDEN", "Doctor profile required");
  }

  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const status = opts.status ?? "ALL";
  const where = {
    doctorId: actor.doctorId,
    ...softDeleteWhere(),
    ...(status === "ALL" ? {} : { status }),
  };

  const [total, draftCount, activeCount, items] = await Promise.all([
    prisma.prescription.count({ where }),
    prisma.prescription.count({
      where: { doctorId: actor.doctorId, ...softDeleteWhere(), status: "DRAFT" },
    }),
    prisma.prescription.count({
      where: { doctorId: actor.doctorId, ...softDeleteWhere(), status: "ACTIVE" },
    }),
    prisma.prescription.findMany({
      where,
      orderBy: { prescribedAt: "desc" },
      skip: (page - 1) * DOCTOR_INBOX_PAGE_SIZE,
      take: DOCTOR_INBOX_PAGE_SIZE,
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        patient: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
  ]);

  await emrAudit({
    type: "prescriptions.list.doctor",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    meta: { count: items.length, status, page },
  });

  return platformOk({
    items,
    total,
    draftCount,
    activeCount,
    pageCount: Math.max(1, Math.ceil(total / DOCTOR_INBOX_PAGE_SIZE)),
  });
}

/** Doctor inbox single-record read, including safety/allergy context (T127). */
export async function getPrescriptionForDoctor(
  actor: EmrActor,
  prescriptionId: string,
) {
  if (actor.role !== "DOCTOR" || !actor.doctorId) {
    return platformFail("FORBIDDEN", "Doctor profile required");
  }

  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, doctorId: actor.doctorId, ...softDeleteWhere() },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      patient: { select: { id: true, name: true, email: true } },
    },
  });
  if (!rx) return platformFail("NOT_FOUND", "Prescription not found");

  const [allergyEntries, medicalProfile] = await Promise.all([
    prisma.allergyEntry.findMany({
      where: { patientUserId: rx.patientUserId, ...softDeleteWhere() },
      select: { substance: true },
    }),
    prisma.medicalProfile.findUnique({
      where: { userId: rx.patientUserId },
      select: { allergies: true },
    }),
  ]);
  const allergies = [
    ...allergyEntries.map((a) => a.substance),
    ...(medicalProfile?.allergies ?? []),
  ];
  const safety = await runSafetyCheck({
    allergies,
    medications: rx.lines.map((l) => l.medicationName),
  });

  await emrAudit({
    type: "prescriptions.view.doctor",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: rx.patientUserId,
    meta: { prescriptionId: rx.id },
  });

  return platformOk({ rx, safety, allergies });
}

export type PrescriptionVersionChainItem = {
  id: string;
  version: number;
  status: string;
  labeledAt: Date;
  reason?: string | null;
};

/**
 * Walk the `renewedFromId`/`renewals` chain to build a read-only version
 * history for a prescription lineage (T132). Ordered oldest → newest.
 */
export async function listPrescriptionVersions(
  actor: EmrActor,
  prescriptionId: string,
): Promise<PlatformResult<PrescriptionVersionChainItem[]>> {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, ...softDeleteWhere() },
    select: { id: true, patientUserId: true },
  });
  if (!rx) return platformFail("NOT_FOUND", "Prescription not found");

  const access = await assertEmrAccess(actor, rx.patientUserId, "read");
  if (!access.ok) return access;

  const chain: PrescriptionVersionChainItem[] = [];
  const seen = new Set<string>();

  let cursor: { id: string; renewedFromId: string | null } | null = await prisma.prescription.findUnique({
    where: { id: rx.id },
    select: { id: true, renewedFromId: true },
  });
  const forward: string[] = [];
  while (cursor && !seen.has(cursor.id)) {
    forward.unshift(cursor.id);
    seen.add(cursor.id);
    if (!cursor.renewedFromId) break;
    cursor = await prisma.prescription.findUnique({
      where: { id: cursor.renewedFromId },
      select: { id: true, renewedFromId: true },
    });
  }

  const rows = await prisma.prescription.findMany({
    where: { id: { in: forward } },
    select: {
      id: true,
      status: true,
      prescribedAt: true,
      signedAt: true,
      contentVersion: true,
    },
  });
  const rowsById = new Map(rows.map((r) => [r.id, r]));

  forward.forEach((id, index) => {
    const row = rowsById.get(id);
    if (!row) return;
    chain.push({
      id: row.id,
      version: index + 1,
      status: row.status,
      labeledAt: row.signedAt ?? row.prescribedAt,
      reason: index === 0 ? null : "Renewed",
    });
  });

  return platformOk(chain);
}

/**
 * Clone an existing signed prescription into a new DRAFT with `renewedFromId`.
 * Patients cannot renew (write_clinical / doctor only).
 */
export async function renewPrescription(
  actor: EmrActor,
  input: { fromPrescriptionId: string },
): Promise<PlatformResult<{ prescriptionId: string }>> {
  if (actor.role === "PATIENT") {
    return platformFail("FORBIDDEN", "Patients cannot renew prescriptions");
  }

  const source = await prisma.prescription.findFirst({
    where: {
      id: input.fromPrescriptionId,
      ...softDeleteWhere(),
      status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
    },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) return platformFail("NOT_FOUND", "Prescription not found");

  const access = await assertEmrAccess(actor, source.patientUserId, "write_clinical");
  if (!access.ok) return access;
  if (!actor.doctorId) return platformFail("FORBIDDEN", "Doctor profile required");

  const created = await prisma.prescription.create({
    data: {
      patientUserId: source.patientUserId,
      doctorId: actor.doctorId,
      appointmentId: source.appointmentId,
      medicationName: source.medicationName,
      instructions: source.instructions,
      status: "DRAFT",
      prescribedAt: new Date(),
      renewedFromId: source.id,
      lines: {
        create: source.lines.map((line, i) => ({
          medicationName: line.medicationName,
          dose: line.dose,
          route: line.route,
          frequency: line.frequency,
          duration: line.duration,
          quantity: line.quantity,
          instructions: line.instructions,
          sortOrder: i,
        })),
      },
    },
  });

  await upsertTimelineEvent({
    patientUserId: source.patientUserId,
    type: "PRESCRIPTION",
    effectiveAt: created.prescribedAt,
    refType: "Prescription",
    refId: created.id,
    title: "Prescription renewed (draft)",
    summary: created.medicationName,
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
  });

  await emrAudit({
    type: "prescriptions.renew",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: source.patientUserId,
    meta: { prescriptionId: created.id, renewedFromId: source.id },
  });

  return platformOk({ prescriptionId: created.id });
}

/**
 * Create or update an unsigned draft. Signed prescriptions are immutable (FR-016).
 * Doctors only (write_clinical); care relationship enforced via `assertEmrAccess`.
 */
export async function savePrescriptionDraft(
  actor: EmrActor,
  input: {
    prescriptionId?: string;
    patientUserId: string;
    appointmentId?: string | null;
    expectedVersion?: number;
    instructions?: string;
    aiAssisted?: boolean;
    lines: PrescriptionLineInput[];
  },
): Promise<PlatformResult<{ prescriptionId: string; version: number }>> {
  const denied = denyPatientPrescriptionMutation(actor);
  if (denied) return denied;

  const access = await assertEmrAccess(actor, input.patientUserId, "write_clinical");
  if (!access.ok) return access;
  if (!actor.doctorId) return platformFail("FORBIDDEN", "Doctor profile required");

  try {
    assertHasLines(input.lines);
  } catch (error) {
    return domainErrorToPlatform(error);
  }

  if (input.appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, doctorId: actor.doctorId },
      select: { status: true },
    });
    if (!appt) return platformFail("NOT_FOUND", "Appointment not found");
    if (isTerminalForClinicalWork(appt.status)) {
      return platformFail("CONFLICT", "Cannot prescribe for cancelled/no-show visits");
    }
  }

  const instructions = input.instructions ?? "";
  const lineData = input.lines.map((line, i) => ({ ...line, sortOrder: i }));
  const medicationName = input.lines
    .map((l) => l.medicationName)
    .join(", ")
    .slice(0, 250);

  let rxId: string;
  if (input.prescriptionId) {
    const mutable = await assertSignedArtifactMutable({
      kind: "prescription",
      id: input.prescriptionId,
    });
    if (!mutable.ok) return mutable;

    const existing = await prisma.prescription.findFirst({
      where: { id: input.prescriptionId, doctorId: actor.doctorId, status: "DRAFT" },
    });
    if (!existing) return platformFail("NOT_FOUND", "Draft prescription not found");
    if (input.expectedVersion != null) {
      const concurrency = checkSoftConcurrency(input.expectedVersion, existing.contentVersion);
      if (!concurrency.ok) return concurrency;
    }

    await prisma.$transaction([
      prisma.prescriptionLine.deleteMany({ where: { prescriptionId: existing.id } }),
      prisma.prescription.update({
        where: { id: existing.id },
        data: {
          medicationName,
          instructions,
          aiAssisted: input.aiAssisted ?? existing.aiAssisted,
          contentVersion: { increment: 1 },
          lines: { create: lineData },
        },
      }),
    ]);
    rxId = existing.id;
  } else {
    const created = await prisma.prescription.create({
      data: {
        patientUserId: input.patientUserId,
        doctorId: actor.doctorId,
        appointmentId: input.appointmentId ?? null,
        medicationName,
        instructions,
        status: "DRAFT",
        prescribedAt: new Date(),
        aiAssisted: input.aiAssisted ?? false,
        lines: { create: lineData },
      },
    });
    rxId = created.id;
  }

  const saved = await prisma.prescription.findUnique({
    where: { id: rxId },
    select: { id: true, contentVersion: true },
  });
  if (!saved) return platformFail("INTERNAL_FAILURE", "Failed to save prescription draft");

  await emrAudit({
    type: "prescriptions.draft.save",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { prescriptionId: saved.id, version: saved.contentVersion },
  });

  return platformOk({ prescriptionId: saved.id, version: saved.contentVersion });
}

/**
 * Sign & issue (FR-015..FR-017): password re-auth, allergy hard-block,
 * interaction acknowledgement, content hash binding, patient notification.
 */
export async function signPrescription(
  actor: EmrActor,
  input: {
    prescriptionId: string;
    expectedVersion: number;
    password: string;
    interactionAck?: boolean;
    allergyDataUnavailableAck?: boolean;
  },
): Promise<PlatformResult<{ prescriptionId: string; signedAt: Date }>> {
  const denied = denyPatientPrescriptionMutation(actor);
  if (denied) return denied;

  const rx = await prisma.prescription.findFirst({
    where: { id: input.prescriptionId, status: "DRAFT" },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!rx) return platformFail("NOT_FOUND", "Draft prescription not found");

  const access = await assertEmrAccess(actor, rx.patientUserId, "sign");
  if (!access.ok) return access;
  if (!actor.doctorId || actor.doctorId !== rx.doctorId) {
    return platformFail("FORBIDDEN", "Doctor does not own this prescription");
  }

  const concurrency = checkSoftConcurrency(input.expectedVersion, rx.contentVersion);
  if (!concurrency.ok) return concurrency;

  try {
    assertHasLines(
      rx.lines.map((l) => ({
        medicationName: l.medicationName,
        dose: l.dose ?? undefined,
        route: l.route ?? undefined,
        frequency: l.frequency ?? undefined,
        duration: l.duration ?? undefined,
        quantity: l.quantity ?? undefined,
        instructions: l.instructions ?? undefined,
      })),
    );
  } catch (error) {
    return domainErrorToPlatform(error);
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { passwordHash: true },
  });
  const passwordOk = user?.passwordHash
    ? await verifyPassword(input.password, user.passwordHash)
    : false;
  if (!passwordOk) {
    await emrAudit({
      type: "prescriptions.sign.denied",
      outcome: "DENIED",
      actorUserId: actor.userId,
      targetUserId: rx.patientUserId,
      meta: { prescriptionId: rx.id, reason: "password" },
    });
    return platformFail("FORBIDDEN", "Password verification failed");
  }

  const [allergyEntries, medicalProfile] = await Promise.all([
    prisma.allergyEntry.findMany({
      where: { patientUserId: rx.patientUserId, ...softDeleteWhere() },
      select: { substance: true },
    }),
    prisma.medicalProfile.findUnique({
      where: { userId: rx.patientUserId },
      select: { allergies: true },
    }),
  ]);
  const allergies = [
    ...allergyEntries.map((a) => a.substance),
    ...(medicalProfile?.allergies ?? []),
  ];
  const safety = await runSafetyCheck({
    allergies,
    medications: rx.lines.map((l) => l.medicationName),
  });
  try {
    assertSafeToSign(safety, {
      interactionAck: input.interactionAck,
      allergyDataUnavailableAck: input.allergyDataUnavailableAck,
    });
  } catch (error) {
    return domainErrorToPlatform(error);
  }

  const now = new Date();
  const signed = await prisma.$transaction(async (tx) => {
    const result = await tx.prescription.updateMany({
      where: { id: rx.id, status: "DRAFT", contentVersion: input.expectedVersion },
      data: {
        status: "ACTIVE",
        signedAt: now,
        signerUserId: actor.userId,
        prescribedAt: now,
        startsAt: now,
        allergyAckAt: input.allergyDataUnavailableAck ? now : null,
        interactionAckAt: input.interactionAck ? now : null,
      },
    });
    if (result.count === 0) return false;

    await tx.notification.create({
      data: {
        recipientUserId: rx.patientUserId,
        category: "PRESCRIPTION",
        title: "New prescription issued",
        body: "Your doctor has issued a new prescription.",
        href: "/patient/prescriptions",
      },
    });
    return true;
  });
  if (!signed) return platformFail("CONFLICT", "Prescription could not be signed");

  await upsertTimelineEvent({
    patientUserId: rx.patientUserId,
    type: "PRESCRIPTION",
    effectiveAt: now,
    refType: "Prescription",
    refId: rx.id,
    title: "Prescription signed",
    summary: rx.medicationName,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
  });

  await emrAudit({
    type: "prescriptions.sign",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: rx.patientUserId,
    meta: { prescriptionId: rx.id, lines: rx.lines.length, aiAssisted: rx.aiAssisted },
  });

  return platformOk({ prescriptionId: rx.id, signedAt: now });
}

/** Deny patient-side prescription mutations at the facade boundary. */
export function denyPatientPrescriptionMutation(
  actor: EmrActor,
): PlatformResult<never> | null {
  if (actor.role === "PATIENT") {
    return platformFail("FORBIDDEN", "Patients cannot mutate prescriptions");
  }
  return null;
}
