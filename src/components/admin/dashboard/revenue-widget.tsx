import { Link } from "@/i18n/routing";
import { ErrorState } from "@/components/platform";
import { formatSar } from "@/lib/platform/localization";
import type { DashboardSnapshot } from "@/domain/admin/dashboard";

export function RevenueWidget({
  snapshot,
  t,
  locale = "en",
}: {
  snapshot: DashboardSnapshot;
  t: { title: string; gross: string; refunds: string; net: string; view: string };
  locale?: "en" | "ar";
}) {
  if (snapshot.revenueSummary.status !== "ok") {
    return <ErrorState title={t.title} message={snapshot.revenueSummary.code} />;
  }
  const d = snapshot.revenueSummary.data;
  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t.title}</h2>
      <div className="mt-4 space-y-2 text-sm">
        <p>
          {t.gross}: <strong>{formatSar(d.grossCents, locale)}</strong>
        </p>
        <p>
          {t.refunds}: <strong>{formatSar(d.refundCents, locale)}</strong>
        </p>
        <p>
          {t.net}: <strong className="text-med-green">{formatSar(d.netCents, locale)}</strong>
        </p>
        <Link href="/admin/revenue" className="text-sm font-medium text-med-green hover:underline">
          {t.view}
        </Link>
      </div>
    </section>
  );
}

export function AiMetricsWidget({
  snapshot,
  t,
}: {
  snapshot: DashboardSnapshot;
  t: { title: string; patient: string; doctor: string; view: string };
}) {
  if (snapshot.aiUsage.status !== "ok") {
    return <ErrorState title={t.title} message={snapshot.aiUsage.code} />;
  }
  const d = snapshot.aiUsage.data;
  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t.title}</h2>
      <div className="mt-4 space-y-2 text-sm">
        <p>
          {t.patient}: <strong>{d.patientMessages}</strong>
        </p>
        <p>
          {t.doctor}: <strong>{d.doctorMessages}</strong>
        </p>
        <Link href="/admin/ai" className="text-sm font-medium text-med-green hover:underline">
          {t.view}
        </Link>
      </div>
    </section>
  );
}
