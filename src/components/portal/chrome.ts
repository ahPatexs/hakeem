import { cn } from "@/lib/utils";

/** Pill nav link used across patient, doctor, and admin sidebars. */
export function portalNavClass(active: boolean) {
  return cn(
    "mx-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
    active
      ? "bg-primary font-semibold text-white shadow-sm"
      : "font-medium text-on-surface-variant hover:bg-primary/8 hover:text-primary",
  );
}

export const portalNavGroupClass =
  "px-5 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/70";

export const segmentedTrackClass =
  "inline-flex items-center rounded-full border border-outline-variant/40 bg-surface-container-low p-0.5";

export function segmentedOptionClass(active: boolean) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "bg-primary text-on-primary shadow-sm"
      : "text-on-surface-variant hover:text-primary",
  );
}

/** White card surface used across portal dashboards (Stitch rounded panels). */
export const portalCardClass =
  "rounded-3xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm";

export const portalShellBgClass =
  "min-h-screen bg-background";