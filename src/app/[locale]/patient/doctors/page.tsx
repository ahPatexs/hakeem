import { setRequestLocale, getTranslations } from "next-intl/server";
import { searchDoctors, listSpecialties } from "@/actions/patient/doctors";
import { DoctorSearch } from "@/components/patient/doctors/doctor-search";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function DoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    specialty?: string;
    page?: string;
    symptomSessionId?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.doctors");

  const page = Number(sp.page ?? "1") || 1;
  const [doctorsResult, specialtiesResult] = await Promise.all([
    searchDoctors({ q: sp.q, specialty: sp.specialty, page }),
    listSpecialties(),
  ]);

  if (!doctorsResult.ok || !specialtiesResult.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <p className="text-sm text-on-surface-variant">{t("sortHint")}</p>
      <DoctorSearch
        doctors={doctorsResult.data.items}
        total={doctorsResult.data.total}
        page={doctorsResult.data.page}
        pageSize={doctorsResult.data.pageSize}
        specialties={specialtiesResult.data}
        initialQ={sp.q}
        initialSpecialty={sp.specialty}
        symptomSessionId={sp.symptomSessionId}
      />
    </div>
  );
}
