import { CriticalAlerts, type CriticalAlertItem } from "@/components/emr/critical-alerts";
import type { EmrSummaryDto } from "@/lib/emr/summary";

export type PatientSummaryLabels = {
  title: string;
  allergies: string;
  medications: string;
  empty: string;
  criticalAlertsTitle: string;
  criticalAlertsEmpty?: string;
};

function toAlertItems(summary: EmrSummaryDto): CriticalAlertItem[] {
  return summary.criticalFlags.map((f) => ({ id: f.id, label: f.label }));
}

export function PatientSummary({
  summary,
  labels,
}: {
  summary: EmrSummaryDto;
  labels: PatientSummaryLabels;
}) {
  const alerts = toAlertItems(summary);
  const hasContent =
    summary.allergies.length > 0 ||
    summary.activeMeds.length > 0 ||
    summary.conditions.length > 0 ||
    alerts.length > 0;

  return (
    <section className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{labels.title}</h2>

      <CriticalAlerts
        alerts={alerts}
        title={labels.criticalAlertsTitle}
        emptyLabel={labels.criticalAlertsEmpty}
      />

      {!hasContent ? (
        <p className="text-sm text-on-surface-variant">{labels.empty}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              {labels.allergies}
            </h3>
            {summary.allergies.length === 0 ? (
              <p className="mt-2 text-sm text-on-surface-variant">—</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {summary.allergies.map((a) => (
                  <li key={a.id} className="text-sm text-primary">
                    {a.substance}
                    {a.severity ? (
                      <span className="ms-2 text-xs text-on-surface-variant">({a.severity})</span>
                    ) : null}
                    {a.criticalFlag ? (
                      <span className="ms-2 text-xs font-medium text-warm-coral">!</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              {labels.medications}
            </h3>
            {summary.activeMeds.length === 0 ? (
              <p className="mt-2 text-sm text-on-surface-variant">—</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {summary.activeMeds.map((m) => (
                  <li key={m.id} className="text-sm text-primary">
                    <span className="font-medium">{m.medicationName}</span>
                    {m.instructions ? (
                      <span className="ms-2 text-xs text-on-surface-variant">{m.instructions}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
