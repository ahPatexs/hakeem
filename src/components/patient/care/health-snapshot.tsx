import { AlertTriangle, Pill } from "lucide-react";
import { portalCardClass } from "@/components/portal/chrome";
import type { EmrSummaryDto } from "@/lib/emr/summary";

export function HealthSnapshot({
  summary,
  labels,
}: {
  summary: EmrSummaryDto;
  labels: {
    title: string;
    allergies: string;
    medications: string;
    emptyAllergies: string;
    emptyMedications: string;
    criticalHint: string;
  };
}) {
  const allergies = summary.allergies.slice(0, 4);
  const meds = summary.activeMeds.slice(0, 3);
  const hasCritical = summary.criticalFlags.length > 0;

  return (
    <section className={`${portalCardClass} space-y-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-headline text-lg text-primary">{labels.title}</h2>
        {hasCritical ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-warm-coral/10 px-3 py-1 text-xs font-semibold text-warm-coral">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {labels.criticalHint}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{labels.allergies}</p>
          {allergies.length === 0 ? (
            <p className="mt-2 text-sm text-on-surface-variant">{labels.emptyAllergies}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {allergies.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    a.criticalFlag
                      ? "bg-warm-coral/10 text-warm-coral"
                      : "bg-surface-container-high text-on-surface"
                  }`}
                >
                  {a.substance}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{labels.medications}</p>
          {meds.length === 0 ? (
            <p className="mt-2 text-sm text-on-surface-variant">{labels.emptyMedications}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {meds.map((m) => (
                <li key={m.id} className="flex items-start gap-2 text-sm text-on-surface">
                  <Pill className="mt-0.5 h-3.5 w-3.5 shrink-0 text-med-green" aria-hidden />
                  <span>
                    <span className="font-medium text-primary">{m.medicationName}</span>
                    {m.instructions ? (
                      <span className="block text-xs text-on-surface-variant line-clamp-1">{m.instructions}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
