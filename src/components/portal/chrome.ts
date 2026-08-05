import { cn } from "@/lib/utils";

/** Stitch-aligned portal nav link (rail indicator on the inline-end edge). */
export function portalNavClass(active: boolean) {
  return cn(
    "flex items-center gap-3 border-e-4 px-4 py-3 text-sm transition-all duration-200",
    active
      ? "border-primary bg-primary/5 font-bold text-primary"
      : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
  );
}

/** White card surface used across portal dashboards (Stitch rounded panels). */
export const portalCardClass =
  "rounded-3xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm";

export const portalShellBgClass =
  "min-h-screen bg-[linear-gradient(180deg,#f5f8fc_0%,#fbf9f8_40%,#fbf9f8_100%)]";