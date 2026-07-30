import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-warm-coral/30 bg-warm-coral/5 px-5 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <h3 className="font-headline text-base text-primary">{title}</h3>
      {message ? <p className="mt-2 text-sm text-on-surface-variant">{message}</p> : null}
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
