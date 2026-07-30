import { setRequestLocale } from "next-intl/server";

/** Auth route group — chrome (nav/footer) is suppressed in the locale layout. */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return children;
}
