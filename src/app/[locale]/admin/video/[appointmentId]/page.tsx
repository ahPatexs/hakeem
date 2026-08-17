import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { getAdminVideoCallLog, listAdminVideoSessions } from "@/actions/admin/video";
import { formatPortalDateTime } from "@/lib/datetime";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export default async function AdminVideoSessionPage({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.video");

  const [board, log] = await Promise.all([
    listAdminVideoSessions(),
    getAdminVideoCallLog({ appointmentId }),
  ]);

  const row = board.ok
    ? [...board.data.live, ...board.data.recent].find((item) => item.appointmentId === appointmentId)
    : undefined;
  const events = log.ok ? log.data.events : [];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/video"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {t("back")}
      </Link>

      <div>
        <h1 className="font-headline text-2xl text-primary">{t("detailTitle")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("detailHint")}</p>
      </div>

      <section className={cn(portalCardClass, "grid gap-3 p-5 sm:grid-cols-2")}>
        <Field label={t("colPatient")} value={row?.patientName ?? "—"} />
        <Field label={t("colDoctor")} value={row?.doctorName ?? "—"} />
        <Field label={t("colState")} value={row ? t(`state.${row.state}` as never) : "—"} />
        <Field
          label={t("colWhen")}
          value={row ? formatPortalDateTime(row.startAt, locale) : "—"}
        />
      </section>

      <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        {t("monitorOnly")}
      </p>

      <section className={cn(portalCardClass, "p-5")}>
        <h2 className="font-headline text-lg text-primary">{t("eventsTitle")}</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">{t("eventsEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-outline-variant/15">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-primary">{event.kind}</span>
                <time className="text-xs text-on-surface-variant">
                  {formatPortalDateTime(event.createdAt, locale)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-on-surface-variant">{label}</p>
      <p className="mt-0.5 font-medium text-primary">{value}</p>
    </div>
  );
}
