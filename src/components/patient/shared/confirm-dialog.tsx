"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ConfirmDialogRoot = DialogPrimitive.Root;
const ConfirmDialogTrigger = DialogPrimitive.Trigger;

const ConfirmDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40", className)}
    {...props}
  />
));
ConfirmDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ConfirmDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <ConfirmDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "glass-card fixed start-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-outline-variant/20 bg-background p-6 shadow-xl focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ConfirmDialogContent.displayName = DialogPrimitive.Content.displayName;

function ConfirmDialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-headline text-lg text-primary", className)}
      {...props}
    />
  );
}

function ConfirmDialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-2 text-sm text-on-surface-variant", className)}
      {...props}
    />
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  destructive = false,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  destructive?: boolean;
  trigger?: React.ReactNode;
}) {
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange?.(false);
    } finally {
      setPending(false);
    }
  }

  const busy = loading || pending;

  return (
    <ConfirmDialogRoot open={open} onOpenChange={onOpenChange}>
      {trigger ? <ConfirmDialogTrigger asChild>{trigger}</ConfirmDialogTrigger> : null}
      <ConfirmDialogContent>
        <ConfirmDialogTitle>{title}</ConfirmDialogTitle>
        {description ? <ConfirmDialogDescription>{description}</ConfirmDialogDescription> : null}
        <div className="mt-6 flex justify-end gap-3">
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" type="button" disabled={busy}>
              {cancelLabel}
            </Button>
          </DialogPrimitive.Close>
          <Button
            variant={destructive ? "default" : "soft"}
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={destructive ? "bg-red-600 hover:bg-red-700" : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </ConfirmDialogContent>
    </ConfirmDialogRoot>
  );
}

export {
  ConfirmDialogRoot,
  ConfirmDialogTrigger,
  ConfirmDialogContent,
  ConfirmDialogTitle,
  ConfirmDialogDescription,
};
