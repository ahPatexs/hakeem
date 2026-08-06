"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: "en" | "ar") {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-outline-variant/40 bg-surface-container-low p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          locale === "en"
            ? "bg-primary text-on-primary shadow-sm"
            : "text-on-surface-variant hover:text-primary",
        )}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          locale === "ar"
            ? "bg-primary text-on-primary shadow-sm"
            : "text-on-surface-variant hover:text-primary",
        )}
        aria-pressed={locale === "ar"}
        aria-label="العربية"
      >
        عربي
      </button>
    </div>
  );
}
