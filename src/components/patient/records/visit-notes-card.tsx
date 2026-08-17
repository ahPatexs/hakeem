"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FileText } from "lucide-react";
import { portalCardClass } from "@/components/portal/chrome";
import { formatPortalDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type PatientVisitNotes = {
  id: string;
  title: string;
  body: string;
  recordedAt: string;
};

export function VisitNotesCard({
  notes,
  className,
}: {
  notes: PatientVisitNotes;
  className?: string;
}) {
  const t = useTranslations("patient.records");
  const locale = useLocale();

  return (
    <section className={cn(portalCardClass, "p-5", className)}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-med-green/15 text-med-green">
          <FileText className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("visitNotesEyebrow")}
          </p>
          <h2 className="font-headline text-lg text-primary">{notes.title}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            {formatPortalDateTime(notes.recordedAt, locale)}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-primary">{notes.body}</p>
          <Link
            href={`/patient/records/${notes.id}`}
            className="mt-3 inline-block text-sm font-medium text-med-green hover:underline"
          >
            {t("openVisitNotes")}
          </Link>
        </div>
      </div>
    </section>
  );
}
