import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { inChartSearch, type InChartSearchFilters } from "./search";

/** Patient medical-record detail with EMR RBAC (T128). */
export async function getMedicalRecord(actor: EmrActor, recordId: string) {
  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    include: {
      doctor: { select: { nameEn: true, nameAr: true, slug: true } },
      document: true,
    },
  });
  if (!record) return platformFail("NOT_FOUND", "Record not found");

  const access = await assertEmrAccess(actor, record.patientUserId, "read");
  if (!access.ok) return access;

  await emrAudit({
    type: "records.view",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: record.patientUserId,
    meta: { recordId: record.id },
  });

  return platformOk(record);
}

/** Paginated medical-record list for a patient chart (T137). */
export async function listMedicalRecords(
  actor: EmrActor,
  patientUserId: string,
  filters: InChartSearchFilters = {},
) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(filters);
  const where = {
    patientUserId,
    ...(search.q
      ? {
          OR: [
            { title: { contains: search.q, mode: "insensitive" as const } },
            { summary: { contains: search.q, mode: "insensitive" as const } },
            { recordType: { contains: search.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.medicalRecord.count({ where }),
    prisma.medicalRecord.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      skip: search.skip,
      take: search.take,
      include: {
        doctor: { select: { nameEn: true, nameAr: true } },
        document: { select: { id: true, title: true } },
      },
    }),
  ]);

  await emrAudit({
    type: "records.list",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: patientUserId,
    meta: { count: items.length },
  });

  return platformOk({
    items,
    total,
    page: search.page,
    pageSize: search.take,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}
