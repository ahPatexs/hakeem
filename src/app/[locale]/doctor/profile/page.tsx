import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getDoctorProfile } from "@/actions/doctor/profile";
import { DoctorProfileForm, DoctorPhotoUpload } from "@/components/doctor/profile/profile-form";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.profile");
  const tNav = await getTranslations("doctor.nav");
  const isAr = locale === "ar";

  const result = await getDoctorProfile();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { user, cmsDoctor, extras } = result.data;
  const specialty = cmsDoctor?.specialty
    ? isAr
      ? cmsDoctor.specialty.nameAr
      : cmsDoctor.specialty.nameEn
    : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
        <Link
          href="/doctor/settings"
          className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-medium text-med-green hover:bg-surface-container-high"
        >
          {tNav("settings")}
        </Link>
      </div>

      <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <h2 className="font-headline text-lg text-primary">{t("publicCard")}</h2>
        <DoctorPhotoUpload
          name={isAr ? cmsDoctor?.nameAr ?? user?.name ?? "" : cmsDoctor?.nameEn ?? user?.name ?? user?.email ?? ""}
          photoUrl={cmsDoctor?.photoUrl}
        />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-on-surface-variant">Name</dt>
            <dd className="mt-0.5 text-primary">
              {isAr ? cmsDoctor?.nameAr ?? user?.name : cmsDoctor?.nameEn ?? user?.name ?? user?.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("specialty")}</dt>
            <dd className="mt-0.5 text-primary">{specialty}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("experience")}</dt>
            <dd className="mt-0.5 text-primary">{cmsDoctor?.yearsExperience ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("rating")}</dt>
            <dd className="mt-0.5 text-primary">
              {cmsDoctor && cmsDoctor.ratingCount > 0
                ? `${cmsDoctor.ratingAvg.toFixed(1)} (${cmsDoctor.ratingCount})`
                : t("noRatings")}
            </dd>
          </div>
        </dl>
      </section>

      <DoctorProfileForm
        bio={extras?.bio ?? null}
        languages={extras?.languages ?? []}
        timezone={extras?.timezone ?? null}
      />
    </div>
  );
}
