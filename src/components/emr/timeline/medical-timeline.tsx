"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { EmrTimelineEventType } from "@/domain/emr/timeline";
import { useEmrTimeline } from "@/hooks/emr/use-emr-timeline";
import { EmptyState } from "@/components/emr/empty-state";
import { ErrorState } from "@/components/emr/error-state";
import { LoadingState } from "@/components/emr/loading-state";
import { Input } from "@/components/ui/input";

const FILTER_TYPES: Array<EmrTimelineEventType | "ALL"> = [
  "ALL",
  "ENCOUNTER",
  "APPOINTMENT",
  "PRESCRIPTION",
  "LAB",
  "IMAGING",
  "DOCUMENT",
  "DIAGNOSIS",
  "NOTE",
  "CONSENT",
  "PLAN",
];

/** Medical timeline with type + text + date-range filters (T148 / FR-048). */
export function MedicalTimeline({
  patientUserId,
  locale = "en",
}: {
  patientUserId: string;
  locale?: string;
}) {
  const t = useTranslations("emr");
  const [typeFilter, setTypeFilter] = useState<EmrTimelineEventType | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const types = useMemo(
    () => (typeFilter === "ALL" ? undefined : [typeFilter]),
    [typeFilter],
  );

  const query = useEmrTimeline({
    patientUserId,
    types,
    q: q.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const filteredItems = useMemo(() => {
    const items = query.data?.items ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (ev) =>
        ev.title.toLowerCase().includes(needle) ||
        (ev.summary ?? "").toLowerCase().includes(needle) ||
        ev.type.toLowerCase().includes(needle),
    );
  }, [query.data?.items, q]);

  return (
    <section className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline text-lg text-primary">{t("timeline.title")}</h2>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="sr-only">{t("timeline.filterType")}</span>
          <select
            className="rounded-xl border border-outline-variant/40 bg-surface px-3 py-1.5 text-sm text-primary"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EmrTimelineEventType | "ALL")}
          >
            {FILTER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? t("timeline.filterAll") : type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block space-y-1 sm:col-span-1">
          <span className="text-xs text-on-surface-variant">{t("timeline.search")}</span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("timeline.searchPlaceholder")}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-on-surface-variant">{t("timeline.from")}</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-on-surface-variant">{t("timeline.to")}</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {query.isLoading ? <LoadingState /> : null}

      {query.isError ? (
        <ErrorState
          title={query.error.message === "RATE_LIMITED" ? t("rateLimitedTitle") : t("error")}
          message={query.error.message === "RATE_LIMITED" ? t("rateLimited") : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && filteredItems.length === 0 ? (
        <EmptyState title={t("timeline.empty")} />
      ) : null}

      {filteredItems.length > 0 ? (
        <ul className="divide-y divide-outline-variant/15">
          {filteredItems.map((ev) => (
            <li key={ev.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-primary">{ev.title}</p>
                  {ev.summary ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">{ev.summary}</p>
                  ) : null}
                  <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">
                    {ev.type}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-on-surface-variant">
                  {fmtDate(ev.effectiveAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
