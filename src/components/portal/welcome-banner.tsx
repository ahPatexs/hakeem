import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WelcomeBanner({
  eyebrow,
  title,
  subtitle,
  action,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-4",
        aside ? "lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]" : null,
        className,
      )}
    >
      <section className="welcome-banner relative flex flex-col justify-center overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 max-w-xl">
          {eyebrow ? <p className="text-sm font-medium text-white/80">{eyebrow}</p> : null}
          <h1 className="font-headline mt-1 text-2xl leading-tight text-white md:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-white/85 md:text-base">{subtitle}</p>
          ) : null}
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
        <svg
          viewBox="0 0 220 160"
          className="pointer-events-none absolute bottom-0 end-0 h-36 w-48 opacity-25 rtl:scale-x-[-1]"
          fill="none"
          aria-hidden
        >
          <path
            d="M20 96h48l16-32 20 64 16-32h60"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="176" cy="48" r="22" fill="white" fillOpacity="0.35" />
        </svg>
      </section>
      {aside ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{aside}</div> : null}
    </div>
  );
}

export function GlanceStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col justify-center rounded-3xl border border-outline-variant/20 bg-surface-container-lowest px-5 py-4 shadow-sm">
      <p className="text-3xl font-bold tabular-nums leading-none text-primary">{value}</p>
      <p className="mt-2 text-sm font-medium text-on-surface-variant">{label}</p>
      {hint ? <p className="mt-0.5 text-xs font-medium text-med-green">{hint}</p> : null}
    </div>
  );
}
