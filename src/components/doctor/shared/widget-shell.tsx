import { Link } from "@/i18n/routing";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export function WidgetShell({
  title,
  href,
  hrefLabel,
  children,
  className,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(portalCardClass, "glass-card p-5 md:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-headline text-lg text-on-surface md:text-xl">{title}</h2>
        {href && hrefLabel ? (
          <Link href={href} className="shrink-0 text-sm font-semibold text-primary hover:underline">
            {hrefLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}