import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card flex flex-col items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-low px-6 py-12 text-center",
        className,
      )}
    >
      <h3 className="font-headline text-lg text-primary">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-on-surface-variant">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Button asChild className="mt-6" variant="soft">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <Button className="mt-6" variant="soft" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
