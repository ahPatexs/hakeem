import { Link } from "@/i18n/routing";
import { AuthMark } from "@/components/auth/auth-mark";

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
    <div className="auth-scene flex items-center justify-center px-margin-mobile py-16 md:px-margin-desktop">
      <div className="auth-card space-y-6">
        <div className="space-y-3 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3" aria-label="Hakeem">
            <AuthMark />
            <span className="font-headline text-xl font-bold tracking-wide text-white">Hakeem</span>
          </Link>
          <h1 className="font-headline text-2xl font-bold text-white">{title}</h1>
          {subtitle ? <p className="text-sm text-white/75">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}