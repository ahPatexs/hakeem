"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { holdAppointmentSlot, confirmAppointment } from "@/actions/patient/appointments";
import type { AvailabilitySlot } from "@/lib/patient/availability-stub";
import type { Doctor, Specialty } from "@prisma/client";

type DoctorDetail = Doctor & { specialty: Specialty };

export function DoctorProfileView({
  doctor,
  availability,
}: {
  doctor: DoctorDetail;
  availability: AvailabilitySlot[];
}) {
  const t = useTranslations("patient.doctors");
  const router = useRouter();
  const [mode, setMode] = useState<"IN_PERSON" | "VIDEO">("IN_PERSON");
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleBook() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const held = await holdAppointmentSlot({
        doctorId: doctor.id,
        mode,
        startAt: selected.startAt,
        endAt: selected.endAt,
      });
      if (!held.ok) {
        setError(t("bookError"));
        return;
      }
      const confirmed = await confirmAppointment({ id: held.data.id });
      if (!confirmed.ok) {
        setError(t("confirmError"));
        return;
      }
      router.push(`/patient/appointments/${confirmed.data.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <header className="glass-card rounded-2xl border border-outline-variant/20 p-6">
        <h1 className="font-headline text-2xl text-primary">{doctor.nameEn}</h1>
        <p className="text-on-surface-variant">{doctor.titleEn}</p>
        <p className="mt-1 text-sm text-med-green">{doctor.specialty.nameEn}</p>
        {doctor.bioEn ? <p className="mt-4 text-sm text-on-surface-variant">{doctor.bioEn}</p> : null}
      </header>

      <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
        <h2 className="font-headline text-lg text-primary">{t("availabilityTitle")}</h2>
        <p className="text-xs text-on-surface-variant">{t("availabilityStubNote")}</p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "IN_PERSON" ? "soft" : "outline"}
            size="sm"
            onClick={() => setMode("IN_PERSON")}
          >
            {t("inPerson")}
          </Button>
          <Button
            type="button"
            variant={mode === "VIDEO" ? "soft" : "outline"}
            size="sm"
            onClick={() => setMode("VIDEO")}
          >
            {t("video")}
          </Button>
        </div>

        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {availability.map((slot) => {
            const label = new Date(slot.startAt).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const active = selected?.startAt === slot.startAt;
            return (
              <Button
                key={slot.startAt}
                type="button"
                variant={active ? "soft" : "outline"}
                size="sm"
                className="h-auto whitespace-normal py-2 text-xs"
                onClick={() => setSelected(slot)}
              >
                {label}
              </Button>
            );
          })}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="button" variant="soft" disabled={!selected || pending} onClick={handleBook}>
          {pending ? t("booking") : t("bookSlot")}
        </Button>
      </section>
    </div>
  );
}
