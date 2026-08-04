"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OutcomeCard } from "@/components/ai/symptom/outcome-card";
import { useSymptomSession } from "@/hooks/ai/use-symptom-session";
import { listUpcoming } from "@/actions/patient/appointments";

export function SessionWizard() {
  const t = useTranslations("ai.symptom");
  const tAi = useTranslations("ai");
  const locale = useLocale();
  const portLocale = locale === "ar" ? "ar" : "en";
  const {
    phase,
    currentQuestion,
    outcome,
    pending,
    errorCode,
    start,
    answer,
    attach,
    attached,
    reset,
  } = useSymptomSession({ locale: portLocale });

  const [complaint, setComplaint] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [appointments, setAppointments] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [selectedAppt, setSelectedAppt] = useState("");
  const [loadingAppts, setLoadingAppts] = useState(false);

  async function loadAppointments() {
    setLoadingAppts(true);
    try {
      const res = await listUpcoming({ page: 1 });
      if (res.ok) {
        const items = res.data.items.map((a) => ({
          id: a.id,
          label: new Date(a.startAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }));
        setAppointments(items);
        if (items[0]) setSelectedAppt(items[0].id);
      }
    } finally {
      setLoadingAppts(false);
    }
  }

  function errorMessage() {
    if (!errorCode) return null;
    if (errorCode === "RATE_LIMITED") return tAi("rateLimited");
    if (errorCode === "DEPENDENCY_UNAVAILABLE" || errorCode === "BUDGET_EXHAUSTED") {
      return tAi("unavailable");
    }
    return t("error");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4" data-ai="symptom-wizard">
      <div>
        <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>
      </div>

      {errorMessage() ? (
        <p role="alert" className="rounded-xl border border-error/30 bg-error-container px-3 py-2 text-sm text-error">
          {errorMessage()}
        </p>
      ) : null}

      {phase === "intake" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void start(complaint);
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-primary">{t("complaintLabel")}</span>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder={t("complaintPlaceholder")}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={pending}
            />
          </label>
          <Button type="submit" disabled={pending || !complaint.trim()}>
            {pending ? t("starting") : t("start")}
          </Button>
        </form>
      ) : null}

      {phase === "question" && currentQuestion ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void answer(answerText).then(() => setAnswerText(""));
          }}
        >
          <p className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-primary">
            {currentQuestion}
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-primary">{t("answerLabel")}</span>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={t("answerPlaceholder")}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={pending}
            />
          </label>
          <Button type="submit" disabled={pending || !answerText.trim()}>
            {pending ? t("submitting") : t("continue")}
          </Button>
        </form>
      ) : null}

      {phase === "outcome" && outcome ? (
        <OutcomeCard
          outcome={outcome}
          attachSlot={
            <div className="space-y-2 border-t border-outline-variant/20 pt-3">
              <p className="text-sm font-medium text-primary">{t("attachTitle")}</p>
              <p className="text-xs text-on-surface-variant">{t("attachHint")}</p>
              {attached ? (
                <p className="text-sm text-med-green">{t("attached")}</p>
              ) : (
                <>
                  {appointments.length === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loadingAppts}
                      onClick={() => void loadAppointments()}
                    >
                      {loadingAppts ? t("loadingAppointments") : t("loadAppointments")}
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="min-w-[12rem] flex-1 space-y-1">
                        <span className="text-xs text-on-surface-variant">{t("selectAppointment")}</span>
                        <select
                          value={selectedAppt}
                          onChange={(e) => setSelectedAppt(e.target.value)}
                          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm"
                        >
                          {appointments.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        disabled={pending || !selectedAppt}
                        onClick={() => void attach(selectedAppt)}
                      >
                        {t("attachCta")}
                      </Button>
                    </div>
                  )}
                </>
              )}
              <Button type="button" variant="ghost" onClick={reset}>
                {t("startOver")}
              </Button>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
