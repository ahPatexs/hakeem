"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { listUpcoming } from "@/actions/patient/appointments";
import {
  aiAttachSessionToBooking,
  aiListSymptomSessions,
} from "@/actions/ai/symptom";
import type { SymptomSessionDto } from "@/lib/ai/symptom";

const OUTCOME_I18N: Record<NonNullable<SymptomSessionDto["outcome"]>, string> = {
  SELF_CARE: "outcomeSelfCare",
  SEE_DOCTOR: "outcomeSeeDoctor",
  URGENT: "outcomeUrgent",
  EMERGENCY: "outcomeEmergency",
};

export function SessionHistory() {
  const t = useTranslations("ai.symptom");
  const locale = useLocale();
  const [items, setItems] = useState<SymptomSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attachForId, setAttachForId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedAppt, setSelectedAppt] = useState("");
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [pendingAttach, setPendingAttach] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await aiListSymptomSessions({ page: 1 });
      if (!res.ok) {
        setError(true);
        return;
      }
      setItems(res.data.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function loadAppointments(sessionId: string) {
    setAttachForId(sessionId);
    setAppointments([]);
    setSelectedAppt("");
    setLoadingAppts(true);
    try {
      const res = await listUpcoming({ page: 1 });
      if (res.ok) {
        const next = res.data.items.map((a) => ({
          id: a.id,
          label: new Date(a.startAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }));
        setAppointments(next);
        if (next[0]) setSelectedAppt(next[0].id);
      }
    } finally {
      setLoadingAppts(false);
    }
  }

  async function attach(sessionId: string) {
    if (!selectedAppt || pendingAttach) return;
    setPendingAttach(true);
    try {
      const res = await aiAttachSessionToBooking({
        sessionId,
        appointmentId: selectedAppt,
      });
      if (res.ok) {
        setAttachForId(null);
        await refresh();
      }
    } finally {
      setPendingAttach(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-3" data-ai="symptom-history">
      <div>
        <h2 className="font-headline text-lg text-primary">{t("historyTitle")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t("historySubtitle")}</p>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">{t("historyLoading")}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-error">
          {t("historyError")}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("historyEmpty")}</p>
      ) : null}

      <ul className="space-y-3">
        {items.map((session) => {
          const dateLabel = new Date(session.createdAt).toLocaleString(
            locale === "ar" ? "ar-SA" : "en-US",
            { dateStyle: "medium", timeStyle: "short" },
          );
          const outcomeLabel = session.outcome
            ? t(OUTCOME_I18N[session.outcome])
            : t("historyInProgress");
          const canAttach = session.status === "COMPLETED" && !session.appointmentId;

          return (
            <li
              key={session.id}
              className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-primary">{outcomeLabel}</p>
                  <p className="text-xs text-on-surface-variant">{dateLabel}</p>
                  {session.rationale ? (
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {session.rationale}
                    </p>
                  ) : null}
                </div>
                {session.appointmentId ? (
                  <p className="text-xs text-med-green">{t("historyAttached")}</p>
                ) : null}
              </div>

              {canAttach ? (
                <div className="mt-3 space-y-2 border-t border-outline-variant/20 pt-3">
                  {attachForId === session.id ? (
                    appointments.length === 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <p className="w-full text-xs text-on-surface-variant">
                          {loadingAppts ? t("loadingAppointments") : t("historyNoUpcoming")}
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/patient/appointments/book?symptomSessionId=${session.id}`}
                          >
                            {t("historyBookAttach")}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-[12rem] flex-1 space-y-1">
                          <span className="text-xs text-on-surface-variant">
                            {t("selectAppointment")}
                          </span>
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
                          size="sm"
                          disabled={pendingAttach || !selectedAppt}
                          onClick={() => void attach(session.id)}
                        >
                          {t("attachCta")}
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/patient/appointments/book?symptomSessionId=${session.id}`}
                          >
                            {t("historyBookAttach")}
                          </Link>
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadAppointments(session.id)}
                      >
                        {t("historyAttachExisting")}
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/patient/appointments/book?symptomSessionId=${session.id}`}
                        >
                          {t("historyBookAttach")}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
