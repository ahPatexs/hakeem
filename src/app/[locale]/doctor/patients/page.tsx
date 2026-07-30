import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { searchPatients } from "@/actions/doctor/patients";
import { EmptyState, ErrorState, Pagination } from "@/components/doctor/shared";

export default async function DoctorPatientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "", page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const t = await getTranslations("doctor.patients");

  const result = await searchPatients({ query: q, page });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { items, total } = result.data;
  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium" })
      : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-on-surface-variant">{t("subtitle")}</p>
      </div>

      <form method="get" className="flex gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-5 text-sm font-medium text-on-primary hover:opacity-90"
        >
          {t("search")}
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((p) => (
              <li
                key={p.id}
                className="glass-card flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-primary">{p.name ?? p.email}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {t("lastVisit")}: {fmtDate(p.lastVisitAt)} · {t("nextVisit")}: {fmtDate(p.nextVisitAt)}
                  </p>
                </div>
                <Link
                  href={`/doctor/patients/${p.id}`}
                  className="shrink-0 rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-medium text-med-green hover:bg-surface-container-high"
                >
                  {t("openChart")}
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={12} total={total} />
        </>
      )}
    </div>
  );
}
