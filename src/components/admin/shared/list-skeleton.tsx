import { cn } from "@/lib/utils";

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container-high" />
      ))}
    </div>
  );
}

export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-32 animate-pulse rounded-2xl bg-surface-container-high", className)}
      aria-busy="true"
    />
  );
}
