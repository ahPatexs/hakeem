"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low px-6 py-8",
        className,
      )}
      role="alert"
    >
      <h3 className="font-headline text-lg text-primary">{title ?? "Something went wrong"}</h3>
      <p className="mt-2 text-sm text-on-surface-variant">
        {message ?? "We could not load this section. Please try again."}
      </p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" size="sm" onClick={onRetry} type="button">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
