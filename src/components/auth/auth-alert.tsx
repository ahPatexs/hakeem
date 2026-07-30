import { cn } from "@/lib/utils";

export function AuthAlert({
  variant = "info",
  children,
  className,
}: {
  variant?: "info" | "success" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "success" && "border-med-green/30 bg-secondary-fixed/40 text-on-secondary-container",
        variant === "error" && "border-error/30 bg-error-container text-error",
        variant === "info" && "border-outline-variant/40 bg-surface-container-low text-on-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}
