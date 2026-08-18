"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { DraftPanel } from "@/components/ai/doctor/draft-panel";
import { RxSuggestPanel } from "@/components/ai/doctor/rx-suggest-panel";
import type { VisitChatRole } from "@/domain/platform/video";
import { platformGetVideoAppointmentPatientUserId, platformListVisitChat } from "@/actions/platform/video";

type Props = {
  appointmentId: string;
  role: VisitChatRole;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function VideoDoctorAiAssist({ appointmentId, role }: Props) {
  const t = useTranslations("platform.video");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"summary" | "rx">("summary");

  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [doctorInput, setDoctorInput] = useState<string>("");
  const [rxIntent, setRxIntent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDoctor = role === "doctor";
  const canOpen = isDoctor && !loading;

  const transcriptPreview = useMemo(() => {
    if (!doctorInput.trim()) return null;
    return truncate(doctorInput, 260);
  }, [doctorInput]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open || !isDoctor) return;
      setLoading(true);
      setError(null);
      try {
        const patientRes = await platformGetVideoAppointmentPatientUserId({ appointmentId });
        if (!patientRes.ok) throw new Error(patientRes.code);

        const chatRes = await platformListVisitChat({ appointmentId });
        if (!chatRes.ok) throw new Error(chatRes.code);

        if (cancelled) return;

        setPatientUserId(patientRes.data.patientUserId);

        const messages = chatRes.data.messages.slice(-10);
        const joined = messages.map((m) => `${m.senderName}: ${m.body}`).join("\n");
        // Both generate SOAP doctorInput and Rx intent share the same constraint: max ~4000.
        setDoctorInput(truncate(joined, 4000));
        setRxIntent(truncate(joined, 4000));
      } catch (e) {
        if (cancelled) return;
        setError(t("aiUnavailableFallback"));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, isDoctor, appointmentId, t]);

  if (!isDoctor) return null;

  return (
    <div className="px-1">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canOpen}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t("aiAssistButton")}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!patientUserId || loading}
            onClick={() => setTab("summary")}
            className={
              tab === "summary"
                ? "rounded-full bg-med-green px-3 py-1 text-[11px] font-semibold text-white"
                : "rounded-full border border-outline-variant/30 px-3 py-1 text-[11px] font-semibold text-on-surface-variant disabled:opacity-50"
            }
          >
            {t("aiAssistSummaryTab")}
          </button>
          <button
            type="button"
            disabled={!patientUserId || loading}
            onClick={() => setTab("rx")}
            className={
              tab === "rx"
                ? "rounded-full bg-med-green px-3 py-1 text-[11px] font-semibold text-white"
                : "rounded-full border border-outline-variant/30 px-3 py-1 text-[11px] font-semibold text-on-surface-variant disabled:opacity-50"
            }
          >
            {t("aiAssistRxTab")}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 rounded-xl border border-outline-variant/20 bg-surface-container-high p-3">
          {loading ? <p className="text-xs text-on-surface-variant">{t("aiAssistLoading")}</p> : null}
          {error ? <p className="text-xs text-warm-coral">{error}</p> : null}

          {patientUserId ? (
            <div className="space-y-3">
              {transcriptPreview ? (
                <p className="text-[11px] text-on-surface-variant">
                  {t("aiAssistUsingChat")}: <span className="font-medium text-primary">{transcriptPreview}</span>
                </p>
              ) : null}

              <div className="max-h-72 overflow-y-auto">
                {tab === "summary" ? (
                  <DraftPanel
                    patientUserId={patientUserId}
                    appointmentId={appointmentId}
                    doctorInput={doctorInput}
                  />
                ) : null}

                {tab === "rx" ? (
                  <RxSuggestPanel patientUserId={patientUserId} initialIntent={rxIntent} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

