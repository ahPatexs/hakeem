import { Link } from "@/i18n/routing";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-fixed/40 via-background to-surface-container-low px-margin-mobile py-16 md:px-margin-desktop">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,168,132,0.12),_transparent_55%)]" />
      <div className="glass-card relative z-10 w-full max-w-md space-y-6 rounded-3xl p-8 shadow-xl">
        <div className="space-y-3 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2" aria-label="Hakeem">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.svg" alt="" width={140} height={40} className="mx-auto h-10 w-auto" />
          </Link>
          <h1 className="font-headline text-2xl font-bold text-primary">{title}</h1>
          {subtitle ? <p className="text-sm text-on-surface-variant">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
