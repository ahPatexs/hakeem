"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: "en" | "ar") {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div className={cn(segmentedTrackClass, className)} role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={segmentedOptionClass(locale === "en")}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        className={segmentedOptionClass(locale === "ar")}
        aria-pressed={locale === "ar"}
        aria-label="العربية"
      >
        عربي
      </button>
    </div>
  );
}
