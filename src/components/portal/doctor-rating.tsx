import { Star } from "lucide-react";

function starClass(filled: boolean, size: "sm" | "md") {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return filled
    ? `${dim} fill-amber-400 text-amber-400`
    : `${dim} fill-transparent text-outline-variant`;
}

export function DoctorRatingStars({
  avg,
  count,
  countLabel,
  emptyLabel,
  size = "md",
}: {
  avg: number;
  count: number;
  countLabel?: string;
  emptyLabel?: string;
  size?: "sm" | "md";
}) {
  if (!count) {
    if (!emptyLabel) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={starClass(false, size)} />
          ))}
        </span>
        <span className="text-xs text-on-surface-variant">{emptyLabel}</span>
      </div>
    );
  }

  const rounded = Math.round(avg);
  return (
    <div className="flex flex-wrap items-center gap-1.5" title={`${avg.toFixed(1)} / 5`}>
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={starClass(n <= rounded, size)} />
        ))}
      </span>
      <span className="text-sm font-semibold text-primary">{avg.toFixed(1)}</span>
      {countLabel ? <span className="text-xs text-on-surface-variant">{countLabel}</span> : null}
    </div>
  );
}

export function RatingPicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="rounded-full p-1 transition hover:bg-amber-50 disabled:opacity-50"
        >
          <Star
            className={
              n <= value
                ? "h-7 w-7 fill-amber-400 text-amber-400"
                : "h-7 w-7 fill-transparent text-outline-variant"
            }
            aria-hidden
          />
          <span className="sr-only">{n}</span>
        </button>
      ))}
    </div>
  );
}
