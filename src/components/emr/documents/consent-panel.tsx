"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  emrAcknowledgeConsent,
  emrWithdrawConsent,
} from "@/actions/emr/consents";
import type { ConsentState } from "@/domain/emr/consent";

export type ConsentPanelItem = {
  typeCode: string;
  nameEn: string;
  nameAr: string;
  state: ConsentState;
  currentTextVersionId: string | null;
};

export function ConsentPanel({
  patientUserId,
  items: initialItems,
  locale = "en",
}: {
  patientUserId: string;
  items: ConsentPanelItem[];
  locale?: string;
}) {
  const t = useTranslations("emr");
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const stateLabel = (state: ConsentState) => {
    if (state === "ACKNOWLEDGED") return t("consent.acknowledged");
    if (state === "WITHDRAWN") return t("consent.withdrawn");
    return t("consent.none");
  };

  const onAcknowledge = (item: ConsentPanelItem) => {
    if (!item.currentTextVersionId) return;
    setError(null);
    startTransition(async () => {
      const result = await emrAcknowledgeConsent({
        patientUserId,
        typeCode: item.typeCode,
        textVersionId: item.currentTextVersionId!,
      });
      if (!result.ok) {
        setError(result.code === "RATE_LIMITED" ? t("rateLimited") : t("error"));
        return;
      }
      setItems((prev) =>
        prev.map((row) =>
          row.typeCode === item.typeCode ? { ...row, state: "ACKNOWLEDGED" as const } : row,
        ),
      );
    });
  };

  const onWithdraw = (item: ConsentPanelItem) => {
    setError(null);
    startTransition(async () => {
      const result = await emrWithdrawConsent({
        patientUserId,
        typeCode: item.typeCode,
      });
      if (!result.ok) {
        setError(result.code === "RATE_LIMITED" ? t("rateLimited") : t("error"));
        return;
      }
      setItems((prev) =>
        prev.map((row) =>
          row.typeCode === item.typeCode ? { ...row, state: "WITHDRAWN" as const } : row,
        ),
      );
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t("consent.title")}</h2>

      {error ? (
        <p className="text-sm text-warm-coral" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {items.map((item) => {
            const name = locale === "ar" ? item.nameAr : item.nameEn;
            return (
              <li
                key={item.typeCode}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary">{name}</p>
                  <p className="text-xs text-on-surface-variant">{stateLabel(item.state)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.state !== "ACKNOWLEDGED" && item.currentTextVersionId ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onAcknowledge(item)}
                      className="rounded-xl bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
                    >
                      {t("consent.acknowledge")}
                    </button>
                  ) : null}
                  {item.state === "ACKNOWLEDGED" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onWithdraw(item)}
                      className="rounded-xl border border-outline-variant/40 px-4 py-1.5 text-sm font-medium text-primary hover:bg-surface-container-high disabled:opacity-50"
                    >
                      {t("consent.withdraw")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
