import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getChart } from "@/actions/doctor/patients";
import type { PatientChart } from "@/lib/doctor/patients";
import {
  emrListAllergies,
  emrListConditions,
  emrGetLifestyle,
  emrGetEmergencyInfo,
  emrListImmunizations,
  emrListFamilyHistory,
} from "@/actions/emr/history";
import { emrListDocuments } from "@/actions/emr/documents";
import { emrListDoctorNotes } from "@/actions/emr/notes";
import { ErrorState, StatusBadge } from "@/components/doctor/shared";
import { PatientFileHero, SnapshotCard } from "@/components/doctor/patients/patient-file-hero";
import { parsePatientFileTab, PatientFileTabs } from "@/components/doctor/patients/patient-file-tabs";
import { LabResultsList, PrescriptionList, DoctorNoteForm, DoctorNoteList } from "@/components/emr";
import { HistoryEditor } from "@/components/emr/history/history-editor";
import { DocumentUploadForm } from "@/components/emr/documents/document-upload-form";
import { DocumentActionsList } from "@/components/emr/documents/document-actions-list";
import { formatApptDay, formatApptTime } from "@/lib/datetime";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export default async function DoctorPatientChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, id } = await params;
  const { tab: tabRaw } = await searchParams;
  setRequestLocale(locale);
  const tab = parsePatientFileTab(tabRaw);
  const t = await getTranslations("doctor.chart");
  const ts = await getTranslations("doctor.status");
  const tSchedule = await getTranslations("doctor.schedule");

  const [result, allergiesResult, conditionsResult] = await Promise.all([
    getChart({ patientUserId: id }),
    emrListAllergies({ patientUserId: id }),
    emrListConditions({ patientUserId: id }),
  ]);
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("accessDenied")} />;
  }

  const chart = result.data;
  const now = new Date();
  const inProgress = chart.pastVisits.find((visit) => visit.status === "IN_PROGRESS") ?? null;
  const upcoming = chart.pastVisits
    .filter(
      (visit) =>
        visit.startAt >= now && ["CONFIRMED", "CHECKED_IN"].includes(visit.status),
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const nextVisit = inProgress ?? upcoming[0] ?? null;
  const lastVisit =
    chart.pastVisits.find((visit) => visit.status === "COMPLETED" && visit.startAt < now) ?? null;
  const allergyNames = allergiesResult.ok
    ? allergiesResult.data.items.map((item) => item.substance)
    : (chart.medicalProfile?.allergies ?? null);
  const conditionNames = conditionsResult.ok
    ? conditionsResult.data.items.map((item) => item.display)
    : (chart.medicalProfile?.conditions ?? []);
  const medicationNames = [
    ...new Set(
      chart.prescriptions
        .filter((rx) => rx.status === "ACTIVE")
        .flatMap((rx) => {
          const fromLines = rx.lines.map((line) => line.medicationName).filter(Boolean);
          return fromLines.length ? fromLines : [rx.medicationName];
        }),
    ),
  ];
  const name = chart.user.name ?? chart.user.email;

  return (
    <div className="space-y-6">
      <PatientFileHero
        patientId={chart.user.id}
        name={name}
        email={chart.user.email}
        photoUrl={chart.user.image}
        dateOfBirth={chart.profile?.dateOfBirth}
        phone={chart.profile?.phone}
        locale={locale}
        allergies={allergyNames}
        nextVisit={nextVisit}
        lastVisit={lastVisit}
        labels={{
          back: t("backToPatients"),
          file: t("title"),
          years: t("years"),
          nextVisit: t("nextVisit"),
          lastVisit: t("lastVisit"),
          noNext: t("noNextVisit"),
          noLast: t("noLastVisit"),
          openVisit: t("openVisit"),
          newRx: t("newRx"),
          video: tSchedule("video"),
          inPerson: tSchedule("inPerson"),
          allergies: t("allergies"),
          noAllergies: t("noAllergies"),
          allergiesUnavailable: t("allergiesUnavailable"),
        }}
      />

      <PatientFileTabs
        patientId={chart.user.id}
        active={tab}
        labels={{
          overview: t("overview"),
          visits: t("visitsTab"),
          treatment: t("treatmentTab"),
          notes: t("notes"),
          records: t("recordsTab"),
        }}
      />

      {tab === "overview" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            label={t("allergies")}
            value={allergyNames ?? []}
            empty={t("noAllergies")}
            tone={(allergyNames?.length ?? 0) > 0 ? "danger" : "default"}
          />
          <SnapshotCard label={t("conditions")} value={conditionNames} empty={t("noneListed")} />
          <SnapshotCard label={t("medications")} value={medicationNames} empty={t("noneListed")} />
          <SnapshotCard
            label={t("bloodType")}
            value={chart.medicalProfile?.bloodType ? [chart.medicalProfile.bloodType] : []}
            empty={t("noneListed")}
          />
        </div>
      ) : null}

      {tab === "visits" ? (
        chart.pastVisits.length === 0 ? (
          <p className={cn(portalCardClass, "px-5 py-10 text-center text-sm text-on-surface-variant")}>
            {t("emptyVisits")}
          </p>
        ) : (
          <ul className="space-y-3">
            {chart.pastVisits.map((visit) => (
              <li key={visit.id} className={cn(portalCardClass, "flex flex-wrap items-center justify-between gap-3 p-4")}>
                <div>
                  <Link href={`/doctor/appointments/${visit.id}`} className="font-semibold text-primary hover:underline">
                    {formatApptDay(visit.startAt, locale)} · {formatApptTime(visit.startAt, locale)}
                  </Link>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {visit.mode === "VIDEO" ? tSchedule("video") : tSchedule("inPerson")}
                    {visit.reason ? ` · ${visit.reason}` : ""}
                  </p>
                </div>
                <StatusBadge status={visit.status} label={ts(visit.status)} variant="appointment" />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "treatment" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <LabResultsList
            items={chart.labs.map((lab) => ({
              id: lab.id,
              title: lab.title,
              releaseStatus: lab.releaseStatus,
              phase: lab.phase,
              criticalFlag: lab.criticalFlag,
              resultedAt: lab.resultedAt,
              summary: lab.summary,
            }))}
            title={t("labs")}
            emptyLabel={t("emptyLabs")}
            locale={locale}
            criticalLabel={t("critical")}
          />
          <PrescriptionList
            items={chart.prescriptions.map((rx) => ({
              id: rx.id,
              medicationName:
                rx.lines.map((line) => line.medicationName).filter(Boolean).join(", ") || rx.medicationName,
              instructions: rx.instructions,
              status: rx.status,
              prescribedAt: rx.prescribedAt,
            }))}
            title={t("prescriptions")}
            emptyLabel={t("emptyPrescriptions")}
            locale={locale}
          />
        </div>
      ) : null}

      {tab === "notes" ? (
        <NotesTab patientUserId={id} locale={locale} soapNotes={chart.soapNotes} />
      ) : null}

      {tab === "records" ? <RecordsTab patientUserId={id} locale={locale} /> : null}
    </div>
  );
}

async function NotesTab({
  patientUserId,
  locale,
  soapNotes,
}: {
  patientUserId: string;
  locale: string;
  soapNotes: PatientChart["soapNotes"];
}) {
  const t = await getTranslations("doctor.chart");
  const ts = await getTranslations("doctor.status");
  const temr = await getTranslations("emr");
  const notesResult = await emrListDoctorNotes({ patientUserId });
  const notes = soapNotes;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={cn(portalCardClass, "p-5")}>
        <h2 className="font-headline text-lg text-primary">{t("notes")}</h2>
        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">{t("emptyNotes")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-outline-variant/15">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link
                    href={`/doctor/consultations/${note.appointmentId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {note.assessment?.slice(0, 80) || t("notes")}
                  </Link>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(note.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <StatusBadge status={note.status} label={ts(note.status as never)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="space-y-4">
        <DoctorNoteForm patientUserId={patientUserId} />
        {notesResult.ok ? (
          <DoctorNoteList
            items={notesResult.data.items.map((n) => ({
              id: n.id,
              status: n.status,
              version: n.version,
              bodyPreview: n.body.slice(0, 160),
              updatedAt: n.updatedAt,
            }))}
            title={temr("notes.title")}
            emptyLabel={t("emptyNotes")}
            locale={locale}
          />
        ) : null}
      </div>
    </div>
  );
}

async function RecordsTab({ patientUserId, locale }: { patientUserId: string; locale: string }) {
  const t = await getTranslations("doctor.chart");
  const temr = await getTranslations("emr");
  const [
    allergiesResult,
    conditionsResult,
    lifestyleResult,
    emergencyResult,
    immunizationsResult,
    familyResult,
    documentsResult,
  ] = await Promise.all([
    emrListAllergies({ patientUserId }),
    emrListConditions({ patientUserId }),
    emrGetLifestyle({ patientUserId }),
    emrGetEmergencyInfo({ patientUserId }),
    emrListImmunizations({ patientUserId }),
    emrListFamilyHistory({ patientUserId }),
    emrListDocuments({ patientUserId, includeDeleted: true }),
  ]);

  return (
    <div className="space-y-6">
      {allergiesResult.ok && conditionsResult.ok ? (
        <HistoryEditor
          patientUserId={patientUserId}
          allergies={allergiesResult.data.items.map((a) => ({
            id: a.id,
            substance: a.substance,
            reaction: a.reaction,
            severity: a.severity,
            source: a.source,
            criticalFlag: a.criticalFlag,
          }))}
          conditions={conditionsResult.data.items.map((c) => ({
            id: c.id,
            display: c.display,
            icd10Code: c.icd10Code,
            status: c.status,
            source: c.source,
          }))}
          lifestyle={
            lifestyleResult.ok && lifestyleResult.data
              ? {
                  smoking: lifestyleResult.data.smoking,
                  alcohol: lifestyleResult.data.alcohol,
                  activity: lifestyleResult.data.activity,
                  notes: lifestyleResult.data.notes,
                }
              : null
          }
          emergency={
            emergencyResult.ok && emergencyResult.data
              ? {
                  contactName: emergencyResult.data.contactName,
                  contactPhone: emergencyResult.data.contactPhone,
                  criticalAlertsText: emergencyResult.data.criticalAlertsText,
                }
              : null
          }
          immunizations={
            immunizationsResult.ok
              ? immunizationsResult.data.items.map((im) => ({
                  id: im.id,
                  vaccineName: im.vaccineName,
                  administeredOn: im.administeredOn,
                  source: im.source,
                }))
              : []
          }
          familyHistory={
            familyResult.ok
              ? familyResult.data.items.map((f) => ({
                  id: f.id,
                  relation: f.relation,
                  conditionDisplay: f.conditionDisplay,
                  notes: f.notes,
                }))
              : []
          }
          source="CLINICIAN_ATTESTED"
          allowCriticalFlag
        />
      ) : (
        <p className="text-sm text-on-surface-variant">{t("historyUnavailable")}</p>
      )}

      <DocumentUploadForm
        patientUserId={patientUserId}
        allowedKinds={["REFERRAL", "CERTIFICATE", "RECORD_ATTACHMENT", "OTHER"]}
      />
      {documentsResult.ok ? (
        <DocumentActionsList
          patientUserId={patientUserId}
          items={documentsResult.data.items.map((d) => ({
            id: d.id,
            title: d.title,
            kind: d.kind,
            classification: d.classification,
            createdAt: d.createdAt,
            deletedAt: d.deletedAt,
            legalHold: d.legalHold,
          }))}
          title={temr("documents.title")}
          emptyLabel={t("emptyFiles")}
          locale={locale}
          canMutate
        />
      ) : null}
    </div>
  );
}
