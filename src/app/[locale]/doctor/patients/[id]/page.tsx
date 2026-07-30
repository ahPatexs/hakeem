import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getChart } from "@/actions/doctor/patients";
import { ErrorState, StatusBadge, AllergyBanner } from "@/components/doctor/shared";

export default async function DoctorPatientChartPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.chart");
  const ts = await getTranslations("doctor.status");

  const result = await getChart({ patientUserId: id });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("accessDenied")} />;
  }

  const chart = result.data;
  const isAr = locale === "ar";
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium" });
  const fmtDateTime = (d: Date | string) =>
    new Date(d).toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  const allergies = chart.medicalProfile?.allergies ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">
            {chart.user.name ?? chart.user.email}
          </h1>
          <p className="mt-1 text-on-surface-variant">{t("title")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/doctor/patients/${chart.user.id}/records`}
            className="rounded-full border border-outline-variant/40 px-5 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
          >
            {t("viewRecords")}
          </Link>
          <Link
            href={`/doctor/prescriptions/new?patient=${chart.user.id}`}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:opacity-90"
          >
            {t("newRx")}
          </Link>
        </div>
      </div>

      <AllergyBanner
        allergies={allergies}
        unavailableLabel={t("allergiesUnavailable")}
        listLabel={t("allergies")}
        noneLabel={t("noAllergies")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overview */}
        <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
          <h2 className="font-headline text-lg text-primary">{t("overview")}</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("phone")}</dt>
              <dd className="mt-0.5 text-primary">{chart.profile?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("dateOfBirth")}</dt>
              <dd className="mt-0.5 text-primary">
                {chart.profile?.dateOfBirth ? fmtDate(chart.profile.dateOfBirth) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("bloodType")}</dt>
              <dd className="mt-0.5 text-primary">{chart.medicalProfile?.bloodType ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("conditions")}</dt>
              <dd className="mt-0.5 text-primary">
                {chart.medicalProfile?.conditions?.length ? chart.medicalProfile.conditions.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("medications")}</dt>
              <dd className="mt-0.5 text-primary">
                {chart.medicalProfile?.currentMedications?.length
                  ? chart.medicalProfile.currentMedications.join(", ")
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Timeline */}
        <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 lg:col-span-2">
          <h2 className="font-headline text-lg text-primary">{t("timeline")}</h2>
          {chart.records.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">{t("emptyTimeline")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-outline-variant/15">
              {chart.records.map((r) => (
                <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-primary">{r.title}</p>
                    <p className="shrink-0 text-xs text-on-surface-variant">{fmtDate(r.recordedAt)}</p>
                  </div>
                  {r.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{r.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Labs */}
        <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 lg:col-span-2">
          <h2 className="font-headline text-lg text-primary">{t("labs")}</h2>
          {chart.labs.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">{t("emptyLabs")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-outline-variant/15">
              {chart.labs.map((lab) => (
                <li key={lab.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-primary">
                      {lab.title}
                      {lab.criticalFlag ? (
                        <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                          {t("critical")}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-on-surface-variant">{fmtDateTime(lab.resultedAt)}</p>
                  </div>
                  <StatusBadge
                    status={lab.releaseStatus}
                    label={lab.releaseStatus === "PENDING_REVIEW" ? t("pendingReview") : undefined}
                    variant="lab"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Prescriptions */}
        <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
          <h2 className="font-headline text-lg text-primary">{t("prescriptions")}</h2>
          {chart.prescriptions.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">{t("emptyPrescriptions")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-outline-variant/15">
              {chart.prescriptions.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">{rx.medicationName}</p>
                    <p className="text-xs text-on-surface-variant">{fmtDate(rx.prescribedAt)}</p>
                  </div>
                  <StatusBadge status={rx.status} label={ts(rx.status as never)} variant="prescription" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Visit notes */}
        <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 lg:col-span-3">
          <h2 className="font-headline text-lg text-primary">{t("notes")}</h2>
          {chart.soapNotes.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">{t("emptyNotes")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-outline-variant/15">
              {chart.soapNotes.map((note) => (
                <li key={note.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      href={`/doctor/consultations/${note.appointmentId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {note.assessment ? note.assessment.slice(0, 80) : "SOAP"}
                    </Link>
                    <p className="text-xs text-on-surface-variant">{fmtDateTime(note.createdAt)}</p>
                  </div>
                  <StatusBadge status={note.status} label={ts(note.status as never)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
