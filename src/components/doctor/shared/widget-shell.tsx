import { Link } from "@/i18n/routing";
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
    <section
      className={cn(
        "glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm font-medium text-med-green hover:underline">
            {hrefLabel ?? "View all"}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
