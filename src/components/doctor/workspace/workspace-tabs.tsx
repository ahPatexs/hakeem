"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SoapEditor, type SoapEditorHandle } from "@/components/doctor/workspace/soap-editor";
import { SummaryEditor } from "@/components/doctor/workspace/summary-editor";
import { AiPanel } from "@/components/doctor/workspace/ai-panel";
import { StatusBadge } from "@/components/doctor/shared";

export type WorkspaceRx = {
  id: string;
  medicationName: string;
  status: string;
  prescribedAt: string;
};

export function WorkspaceTabs({
  appointmentId,
  patientUserId,
  soap,
  summary,
  prescriptions,
  readOnly,
}: {
  appointmentId: string;
  patientUserId: string;
  soap: {
    noteId?: string;
    version?: number;
    status?: "DRAFT" | "FINAL";
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    aiAssisted?: boolean;
  };
  summary: { summaryId?: string; version?: number; status?: "DRAFT" | "FINAL"; body?: string };
  prescriptions: WorkspaceRx[];
  readOnly: boolean;
}) {
  const t = useTranslations("doctor.workspace.tabs");
  const trx = useTranslations("doctor.rx");
  const ts = useTranslations("doctor.status");
  const locale = useLocale();
  const [tab, setTab] = useState<"soap" | "summary" | "prescriptions" | "ai">("soap");
  const soapRef = useRef<SoapEditorHandle>(null);

  const tabs = [
    { key: "soap" as const, label: t("soap") },
    { key: "summary" as const, label: t("summary") },
    { key: "prescriptions" as const, label: t("prescriptions") },
    { key: "ai" as const, label: t("ai") },
  ];

  return (
    <div className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-outline-variant/20 pb-3" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className={
              tab === x.key
                ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary"
                : "rounded-full px-4 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Keep SOAP mounted so AI-insert works from the AI tab */}
      <div className={tab === "soap" ? "" : "hidden"}>
        <SoapEditor ref={soapRef} appointmentId={appointmentId} initial={soap} readOnly={readOnly} />
      </div>

      {tab === "summary" ? (
        <SummaryEditor appointmentId={appointmentId} initial={summary} readOnly={readOnly} />
      ) : null}

      {tab === "prescriptions" ? (
        <div className="space-y-3">
          {!readOnly ? (
            <Link
              href={`/doctor/prescriptions/new?patient=${patientUserId}&appointment=${appointmentId}`}
              className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:opacity-90"
            >
              {trx("new")}
            </Link>
          ) : null}
          {prescriptions.length === 0 ? (
            <p className="text-sm text-on-surface-variant">{trx("emptyTitle")}</p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {prescriptions.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      href={`/doctor/prescriptions/${rx.id}`}
                      className="truncate font-medium text-primary hover:underline"
                    >
                      {rx.medicationName}
                    </Link>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(rx.prescribedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                    </p>
                  </div>
                  <StatusBadge status={rx.status} label={ts(rx.status as never)} variant="prescription" />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "ai" ? (
        <AiPanel
          patientUserId={patientUserId}
          appointmentId={appointmentId}
          defaultMode="DOCUMENTATION"
          compact
          onInsert={(text) => {
            soapRef.current?.insertText(text);
            setTab("soap");
          }}
        />
      ) : null}
    </div>
  );
}
