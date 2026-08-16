import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getAppointment } from "@/actions/patient/appointments";
import { getDoctorAvailability } from "@/actions/patient/doctors";
import { AppointmentDetailView } from "@/components/patient/appointments/appointment-detail";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.appointments");

  const result = await getAppointment(id);
  if (!result.ok) {
    if (result.code === "FORBIDDEN") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  const availability = await getDoctorAvailability({ slug: result.data.doctor.slug });

  return (
    <AppointmentDetailView
      appointment={result.data}
      availability={availability.ok ? availability.data.slots : []}
    />
  );
}
