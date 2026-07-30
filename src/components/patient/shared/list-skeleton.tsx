import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-low p-4"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "glass-card space-y-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-6",
        className,
      )}
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-5 w-1/3" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
