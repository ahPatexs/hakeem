"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  aiDismissCdsInsight,
  aiListCdsInsights,
} from "@/actions/ai/clinical-support";
import { Lightbulb, X } from "lucide-react";

type CdsInsight = {
  id: string;
  title: string;
  body: string;
  kind: "ALLERGY" | "INTERACTION" | "HISTORY" | "CARE_GAP";
  evidence: string;
  chartCategories: string[];
};

export function CdsInsights({
  patientUserId,
  readOnly = false,
}: {
  patientUserId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("ai.cds");
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<CdsInsight[]>([]);
  const [error, setError] = useState<"unavailable" | "generic" | "forbidden" | null>(null);
  const [loaded, setLoaded] = useState(false);

  function load() {
    startTransition(async () => {
      setError(null);
      const res = await aiListCdsInsights({ patientUserId });
      setLoaded(true);
      if (!res.ok) {
        if (res.code === "FORBIDDEN") setError("forbidden");
        else if (
          res.code === "DEPENDENCY_UNAVAILABLE" ||
          res.code === "BUDGET_EXHAUSTED" ||
          res.code === "RATE_LIMITED"
        ) {
          setError("unavailable");
        } else {
          setError("generic");
        }
        return;
      }
      setItems(res.data.items);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per patient
  }, [patientUserId]);

  function dismiss(insightId: string) {
    if (readOnly || pending) return;
    startTransition(async () => {
      const res = await aiDismissCdsInsight({ insightId, patientUserId });
      if (!res.ok) {
        if (res.code === "FORBIDDEN") setError("forbidden");
        else setError("generic");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== insightId));
    });
  }

  function kindLabel(kind: CdsInsight["kind"]) {
    switch (kind) {
      case "ALLERGY":
        return t("kindAllergy");
      case "INTERACTION":
        return t("kindInteraction");
      case "HISTORY":
        return t("kindHistory");
      case "CARE_GAP":
        return t("kindCareGap");
      default:
        return kind;
    }
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4"
      data-ai-cds-insights
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-med-green" aria-hidden />
          <h3 className="font-headline text-base text-primary">{t("title")}</h3>
        </div>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={load}>
          {t("refresh")}
        </Button>
      </div>

      <p className="text-xs text-on-surface-variant">{t("subtitle")}</p>

      {pending && !loaded ? (
        <p className="text-xs text-on-surface-variant">{t("loading")}</p>
      ) : null}

      {error === "unavailable" ? (
        <p className="text-sm text-on-surface-variant" role="status">
          {t("unavailable")}
        </p>
      ) : null}
      {error === "forbidden" ? (
        <p className="text-sm text-red-600" role="alert">
          {t("forbidden")}
        </p>
      ) : null}
      {error === "generic" ? (
        <p className="text-sm text-red-600" role="alert">
          {t("error")}
        </p>
      ) : null}

      {loaded && !error && items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("empty")}</p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-outline-variant/25 bg-surface px-3 py-2"
            data-ai-cds-insight={item.kind}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                    {kindLabel(item.kind)}
                  </span>
                  <h4 className="text-sm font-medium text-primary">{item.title}</h4>
                </div>
                <p className="text-sm text-on-surface-variant">{item.body}</p>
                <p className="text-xs text-on-surface-variant/80">
                  {t("evidence")}: {item.evidence}
                </p>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  disabled={pending}
                  className="shrink-0 rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                  aria-label={t("dismiss")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
