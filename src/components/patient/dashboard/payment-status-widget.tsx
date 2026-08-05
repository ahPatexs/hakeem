"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import type { WidgetResult } from "@/lib/patient/dashboard";
import type { PaymentObligation } from "@prisma/client";
import { useRouter } from "@/i18n/routing";

export function PaymentStatusWidget({
  result,
}: {
  result: WidgetResult<{
    pendingCount: number;
    pendingTotalCents: number;
    obligations: PaymentObligation[];
  }>;
}) {
  const t = useTranslations("patient.dashboard.payments");
  const router = useRouter();

  if (!result.ok) {
    return (
      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <ErrorState className="mt-3" message={t("error")} onRetry={() => router.refresh()} />
      </section>
    );
  }

  const { pendingCount, pendingTotalCents, obligations } = result.data;

  if (pendingCount === 0) {
    return (
      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <EmptyState
          className="mt-3 border-0 bg-transparent py-6"
          title={t("emptyTitle")}
          actionLabel={t("viewAll")}
          actionHref="/patient/payments"
        />
      </section>
    );
  }

  return (
    <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <Link href="/patient/payments" className="text-sm font-medium text-med-green hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <p className="text-sm text-on-surface-variant">
        {t("pendingSummary", {
          count: pendingCount,
          total: (pendingTotalCents / 100).toFixed(2),
        })}
      </p>
      <ul className="mt-3 divide-y divide-outline-variant/15">
        {obligations.slice(0, 3).map((o) => (
          <li key={o.id} className="py-2 first:pt-0 last:pb-0">
            <Link href={`/patient/payments/${o.id}`} className="text-sm font-medium text-primary hover:underline">
              {o.description}
            </Link>
            <p className="text-xs text-on-surface-variant">
              {(o.amountCents / 100).toFixed(2)} {o.currency}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
