"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={next === "ar" ? "Switch to Arabic" : "Switch to English"}
      onClick={() => router.replace(pathname, { locale: next })}
    >
      {next.toUpperCase()}
    </Button>
  );
}
