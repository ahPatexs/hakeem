import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { Alexandria, Montserrat } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChromeGate } from "@/components/layout/chrome-gate";
import { ThemeScript } from "@/components/portal/theme-script";
import { THEME_COOKIE } from "@/lib/platform/theme";
import type { Locale } from "@/content/types";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

/** Official Arabic companion to Montserrat (Google Fonts name: Alexandria). */
const montserratArabic = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const themePref = (await cookies()).get(THEME_COOKIE)?.value;
  const darkClass = themePref === "dark" ? "dark" : "";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${montserrat.variable} ${montserratArabic.variable} ${darkClass}`.trim()}
    >
      <body className="font-sans">
        <ThemeScript />
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <ChromeGate
            nav={<Navbar locale={locale as Locale} />}
            footer={<Footer />}
          >
            {children}
          </ChromeGate>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
