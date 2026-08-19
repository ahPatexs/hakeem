"use client";

import { useTranslations } from "next-intl";
import type { GuardrailEventDto } from "@/lib/ai/ops";

function formatWhen(value: Date | string) {
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 19).replace("T", " ");
}

export function GuardrailLog({
  items,
  total,
}: {
  items: GuardrailEventDto[];
  total: number;
}) {
  const t = useTranslations("ai.admin");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline text-xl text-primary">{t("monitoringTitle")}</h2>
        <p className="text-sm text-on-surface-variant">{t("monitoringSubtitle")}</p>
      </div>

      <p className="text-sm text-on-surface-variant">
        {t("guardrailTotal", { total })}
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("guardrailEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-3 py-2 font-medium">{t("colTrigger")}</th>
                <th className="px-3 py-2 font-medium">{t("colFeature")}</th>
                <th className="px-3 py-2 font-medium">{t("colRole")}</th>
                <th className="px-3 py-2 font-medium">{t("colCategory")}</th>
                <th className="px-3 py-2 font-medium">{t("colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-outline-variant/10">
                  <td className="px-3 py-2">{row.trigger}</td>
                  <td className="px-3 py-2">{row.feature}</td>
                  <td className="px-3 py-2">{row.role}</td>
                  <td className="px-3 py-2">{row.category ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatWhen(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-on-surface-variant">{t("noContentNote")}</p>
    </div>
  );
}
