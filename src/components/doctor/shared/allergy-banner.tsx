import { AlertTriangle } from "lucide-react";

export function AllergyBanner({
  allergies,
  unavailableLabel,
  listLabel,
  noneLabel,
}: {
  allergies: string[] | null;
  unavailableLabel: string;
  listLabel: string;
  noneLabel: string;
}) {
  return (
    <div
      className={
        allergies === null
          ? "flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          : allergies.length > 0
            ? "flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
            : "flex items-center gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant"
      }
      role="status"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      {allergies === null
        ? unavailableLabel
        : allergies.length > 0
          ? `${listLabel}: ${allergies.join(", ")}`
          : noneLabel}
    </div>
  );
}
