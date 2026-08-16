"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RatingPicker } from "@/components/portal/doctor-rating";
import { rateDoctorVisit } from "@/actions/patient/appointments";

export function RateDoctorForm({
  appointmentId,
  initialScore,
  initialComment,
}: {
  appointmentId: string;
  initialScore?: number | null;
  initialComment?: string | null;
}) {
  const t = useTranslations("patient.appointments");
  const router = useRouter();
  const [score, setScore] = useState(initialScore ?? 0);
  const [comment, setComment] = useState(initialComment ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const hasExisting = Boolean(initialScore);

  function handleSubmit() {
    if (score < 1) return;
    setError(null);
    startTransition(async () => {
      const result = await rateDoctorVisit({
        appointmentId,
        score,
        comment: comment.trim() || undefined,
      });
      if (!result.ok) {
        setError(t("rateError"));
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="glass-card space-y-4 rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
      <div>
        <h2 className="font-headline text-lg text-primary">{t("rateTitle")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t("rateHint")}</p>
      </div>
      <RatingPicker value={score} onChange={setScore} disabled={pending} label={t("rateTitle")} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder={t("rateComment")}
        className="w-full rounded-2xl border border-outline-variant/30 bg-background px-4 py-3 text-sm"
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm font-medium text-med-green">{t("rateThanks")}</p> : null}
      <Button
        type="button"
        className="rounded-full"
        disabled={score < 1 || pending}
        onClick={handleSubmit}
      >
        {pending ? t("rateSaving") : hasExisting ? t("rateUpdate") : t("rateSubmit")}
      </Button>
    </section>
  );
}
