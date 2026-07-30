import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low px-6 py-16 text-center",
        className,
      )}
    >
      <h3 className="font-headline text-lg text-primary">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
