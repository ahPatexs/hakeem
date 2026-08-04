import { AlertTriangle } from "lucide-react";

export type CriticalAlertItem = {
  id: string;
  label: string;
};

export function CriticalAlerts({
  alerts,
  title = "Critical alerts",
  emptyLabel,
}: {
  alerts: CriticalAlertItem[];
  title?: string;
  /** When set and alerts is empty, render a calm empty cue; otherwise render nothing. */
  emptyLabel?: string;
}) {
  if (alerts.length === 0) {
    if (!emptyLabel) return null;
    return (
      <div
        className="flex items-center gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant"
        role="status"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-2 rounded-2xl border border-warm-coral/40 bg-warm-coral/5 px-4 py-3 text-sm text-warm-coral"
      role="alert"
      aria-label={title}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium text-warm-coral">{title}</p>
        <ul className="mt-1 list-disc ps-4 text-on-surface">
          {alerts.map((alert) => (
            <li key={alert.id}>{alert.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
