import type { AppointmentMode, AppointmentStatus } from "@prisma/client";
import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { inChartSearch, type InChartSearchFilters } from "./search";

export type EncounterListItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  mode: AppointmentMode;
  doctorId: string;
  reason: string | null;
  hasSoapNote: boolean;
  hasDiagnoses: boolean;
  hasPrescription: boolean;
};

export type EncounterDetail = EncounterListItem & {
  patientUserId: string;
  locationText: string | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
  soapNotes: Array<{
    id: string;
    status: string;
    version: number;
    signedAt: Date | null;
    updatedAt: Date;
  }>;
  diagnoses: Array<{
    id: string;
    display: string;
    icd10Code: string | null;
    status: string;
    recordedAt: Date;
  }>;
  prescriptions: Array<{
    id: string;
    medicationName: string;
    status: string;
    prescribedAt: Date;
  }>;
};

/**
 * List a patient's encounters (Appointments), with documentation completeness
 * flags used by the Encounters UI to surface undocumented visits.
 */
export async function listEncounters(
  actor: EmrActor,
  patientUserId: string,
  filters: InChartSearchFilters = {},
): Promise<PlatformResult<{ items: EncounterListItem[]; total: number; page: number; pageCount: number }>> {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(filters);

  const where = {
    patientUserId,
    status: { notIn: ["HELD" as const] },
    ...(search.status ? { status: search.status as AppointmentStatus } : {}),
  };

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: search.skip,
      take: search.take,
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        mode: true,
        doctorId: true,
        reason: true,
      },
    }),
  ]);

  const appointmentIds = appointments.map((a) => a.id);
  const [soapNotes, diagnoses, prescriptions] = appointmentIds.length
    ? await Promise.all([
        prisma.soapNote.findMany({
          where: { appointmentId: { in: appointmentIds }, status: "FINAL" },
          select: { appointmentId: true },
        }),
        prisma.diagnosis.findMany({
          where: { appointmentId: { in: appointmentIds }, ...softDeleteWhere() },
          select: { appointmentId: true },
        }),
        prisma.prescription.findMany({
          where: { appointmentId: { in: appointmentIds }, ...softDeleteWhere() },
          select: { appointmentId: true },
        }),
      ])
    : [[], [], []];

  const soapSet = new Set(soapNotes.map((n) => n.appointmentId));
  const diagnosisSet = new Set(diagnoses.map((d) => d.appointmentId).filter((id): id is string => !!id));
  const prescriptionSet = new Set(
    prescriptions.map((p) => p.appointmentId).filter((id): id is string => !!id),
  );

  const items: EncounterListItem[] = appointments.map((a) => ({
    id: a.id,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    mode: a.mode,
    doctorId: a.doctorId,
    reason: a.reason,
    hasSoapNote: soapSet.has(a.id),
    hasDiagnoses: diagnosisSet.has(a.id),
    hasPrescription: prescriptionSet.has(a.id),
  }));

  return platformOk({
    items,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}

/** Encounter detail with related SOAP notes / diagnoses / prescriptions, when present. */
export async function getEncounter(
  actor: EmrActor,
  appointmentId: string,
): Promise<PlatformResult<EncounterDetail>> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientUserId: true,
      startAt: true,
      endAt: true,
      status: true,
      mode: true,
      doctorId: true,
      reason: true,
      locationText: true,
      checkedInAt: true,
      completedAt: true,
    },
  });
  if (!appointment) return platformFail("NOT_FOUND", "Encounter not found");

  const access = await assertEmrAccess(actor, appointment.patientUserId, "read");
  if (!access.ok) return access;

  const [soapNotes, diagnoses, prescriptions] = await Promise.all([
    prisma.soapNote.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { version: "desc" },
      select: { id: true, status: true, version: true, signedAt: true, updatedAt: true },
    }),
    prisma.diagnosis.findMany({
      where: { appointmentId: appointment.id, ...softDeleteWhere() },
      orderBy: { recordedAt: "desc" },
      select: { id: true, display: true, icd10Code: true, status: true, recordedAt: true },
    }),
    prisma.prescription.findMany({
      where: { appointmentId: appointment.id, ...softDeleteWhere() },
      orderBy: { prescribedAt: "desc" },
      select: { id: true, medicationName: true, status: true, prescribedAt: true },
    }),
  ]);

  return platformOk({
    id: appointment.id,
    patientUserId: appointment.patientUserId,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    status: appointment.status,
    mode: appointment.mode,
    doctorId: appointment.doctorId,
    reason: appointment.reason,
    locationText: appointment.locationText,
    checkedInAt: appointment.checkedInAt,
    completedAt: appointment.completedAt,
    hasSoapNote: soapNotes.some((n) => n.status === "FINAL"),
    hasDiagnoses: diagnoses.length > 0,
    hasPrescription: prescriptions.length > 0,
    soapNotes,
    diagnoses,
    prescriptions,
  });
}
