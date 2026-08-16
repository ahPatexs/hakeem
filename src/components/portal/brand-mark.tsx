import { cn } from "@/lib/utils";

/** Compact Hakeem pulse mark for portal chrome. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-med-green shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
        <path
          d="M4 16h6l3-6 4 12 3-6h8"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
