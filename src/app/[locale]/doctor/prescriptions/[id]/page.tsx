import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPrescription } from "@/actions/doctor/prescriptions";
import { PrescriptionForm } from "@/components/doctor/prescriptions/prescription-form";
import { PrescriptionReviewSign } from "@/components/doctor/prescriptions/prescription-review-sign";
import { ErrorState, StatusBadge } from "@/components/doctor/shared";

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.rx");
  const tc = await getTranslations("doctor.common");
  const ts = await getTranslations("doctor.status");

  const result = await getPrescription({ prescriptionId: id });
  if (!result.ok) {
    return <ErrorState title={t("viewTitle")} message={tc("notFound")} />;
  }

  const { rx, safety, allergies } = result.data;
  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/doctor/prescriptions"
            className="text-sm font-medium text-med-green hover:underline"
          >
            ← {tc("back")}
          </Link>
          <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">
            {rx.status === "DRAFT" ? t("reviewTitle") : t("viewTitle")}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t("patient")}: {rx.patient.name ?? rx.patient.email}
          </p>
        </div>
        <StatusBadge status={rx.status} label={ts(rx.status as never)} variant="prescription" />
      </div>

      {rx.status === "DRAFT" ? (
        <>
          <PrescriptionForm
            patientUserId={rx.patientUserId}
            appointmentId={rx.appointmentId ?? undefined}
            initial={{
              prescriptionId: rx.id,
              version: rx.contentVersion,
              instructions: rx.instructions ?? "",
              aiAssisted: rx.aiAssisted,
              lines: rx.lines,
            }}
          />
          <hr className="border-outline-variant/20" />
          <PrescriptionReviewSign
            prescriptionId={rx.id}
            expectedVersion={rx.contentVersion}
            lines={rx.lines}
            instructions={rx.instructions}
            allergies={allergies}
            safety={safety}
            aiAssisted={rx.aiAssisted}
          />
        </>
      ) : (
        <div className="space-y-6">
          {rx.signedAt ? (
            <p className="rounded-2xl border border-med-green/30 bg-med-green/5 px-4 py-3 text-sm text-med-green">
              {t("signedBadge")} · {fmtDate(rx.signedAt)}
            </p>
          ) : null}
          <p className="text-sm text-on-surface-variant">{t("immutableNote")}</p>
          <ul className="space-y-3">
            {rx.lines.map((line, i) => (
              <li
                key={line.id}
                className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
              >
                <p className="font-medium text-primary">
                  {i + 1}. {line.medicationName}
                </p>
                {(line.dose || line.frequency) && (
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {[line.dose, line.frequency].filter(Boolean).join(" · ")}
                  </p>
                )}
                {line.instructions ? (
                  <p className="mt-1 text-sm text-on-surface-variant">{line.instructions}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {rx.instructions ? (
            <div className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
              <p className="text-xs font-medium uppercase text-on-surface-variant">
                {t("generalInstructions")}
              </p>
              <p className="mt-1 text-sm text-primary">{rx.instructions}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
