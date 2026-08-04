import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { isValidIcd10Format } from "@/domain/emr/diagnosis";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { inChartSearch, textContains, type InChartSearchFilters } from "./search";
import { upsertTimelineEvent } from "./timeline";

export async function listDiagnoses(
  actor: EmrActor,
  patientUserId: string,
  filters: InChartSearchFilters = {},
) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(filters);
  const contains = textContains(search.q);

  const where = {
    patientUserId,
    ...softDeleteWhere(),
    ...(search.status ? { status: search.status } : {}),
    ...(contains
      ? {
          OR: [
            { display: contains },
            { icd10Code: contains },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.diagnosis.count({ where }),
    prisma.diagnosis.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      skip: search.skip,
      take: search.take,
    }),
  ]);

  return platformOk({
    items,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}

export async function upsertDiagnosis(
  actor: EmrActor,
  input: {
    patientUserId: string;
    id?: string;
    display: string;
    icd10Code?: string | null;
    status?: string;
    appointmentId?: string | null;
  },
): Promise<PlatformResult<{ id: string }>> {
  const access = await assertEmrAccess(actor, input.patientUserId, "write_clinical");
  if (!access.ok) return access;

  const display = input.display.trim();
  if (!display) return platformFail("VALIDATION_ERROR", "Display is required");

  const icd10Code = input.icd10Code?.trim() || null;
  if (icd10Code && !isValidIcd10Format(icd10Code)) {
    return platformFail("VALIDATION_ERROR", "Invalid ICD-10 code format");
  }
  const data = {
    display,
    icd10Code,
    status: input.status?.trim() || "ACTIVE",
    appointmentId: input.appointmentId ?? null,
    recordedByUserId: actor.userId,
    recordedAt: new Date(),
  };

  let row;
  if (input.id) {
    const existing = await prisma.diagnosis.findFirst({
      where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
    });
    if (!existing) return platformFail("NOT_FOUND", "Diagnosis not found");
    row = await prisma.diagnosis.update({ where: { id: existing.id }, data });
  } else {
    row = await prisma.diagnosis.create({
      data: { patientUserId: input.patientUserId, ...data },
    });
  }

  await upsertTimelineEvent({
    patientUserId: input.patientUserId,
    type: "DIAGNOSIS",
    effectiveAt: row.recordedAt,
    refType: "Diagnosis",
    refId: row.id,
    title: row.display,
    summary: row.icd10Code,
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
  });

  await emrAudit({
    type: "diagnosis.upsert",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id, icd10Code: row.icd10Code },
  });

  return platformOk({ id: row.id });
}
