import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

export function KpiCard({
  label,
  value,
  href,
  subtext,
  className,
}: {
  label: string;
  value: string | number;
  href?: string;
  subtext?: string;
  className?: string;
}) {
  const body = (
    <div
      className={cn(
        "glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 transition-shadow hover:shadow-md",
        href && "cursor-pointer",
        className,
      )}
    >
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      <p className="mt-2 font-headline text-3xl text-primary">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-med-green">{subtext}</p> : null}
    </div>
  );
  if (href) return <Link href={href}>{body}</Link>;
  return body;
}
